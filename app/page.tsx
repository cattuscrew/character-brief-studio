"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertTriangle, Archive, ArrowDown, ArrowUp, Check, ChevronDown, Copy, Download,
  FileImage, FolderOpen, ImagePlus, Info, Plus, RotateCcw, Save, Sparkles,
  Trash2, Upload, X,
} from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import {
  composePrimaryRequest, composeRecipe, createDraft, draftToRecipe, fieldDefinitions,
  getField, promptFieldIds, recipeToDraft, referenceRoles,
  type ChoiceOption, type CustomOption, type PromptFieldDefinition, type PromptFieldId,
  type RecipeDraft, type RecipeV2, type ReferenceAsset,
} from "@/lib/brief-studio";
import {
  deleteCustomOption, deleteRecipe, exportRecipeBundle, getRecipe, importRecipeBundle,
  listCustomOptions, listRecipes, saveCustomOption, saveRecipe, validateReferenceFiles,
} from "@/lib/recipe-storage";

declare global {
  interface Document {
    modelContext?: {
      registerTool(tool: { name:string; title?:string; description:string; inputSchema:object; annotations?:{readOnlyHint?:boolean;untrustedContentHint?:boolean}; execute(input:unknown):unknown|Promise<unknown> }, options?:{signal?:AbortSignal}):void|Promise<void>;
    };
  }
}

const configureInput = z.object({
  selections: z.record(z.array(z.string())).optional(),
  custom: z.record(z.array(z.string())).optional(),
  exactText: z.string().optional(),
}).strict();

const exclusiveSubgroups = new Set(["Subject base","Role","Action","Main setting","Primary medium","Framing","Viewpoint","Camera angle","Layout","Lighting","Strategy"]);

function validateConfiguration(input:z.infer<typeof configureInput>){
  for(const [fieldId,values] of Object.entries(input.selections??{})){
    if(!promptFieldIds.includes(fieldId as PromptFieldId))throw new Error(`Unknown prompt field: ${fieldId}`);
    const definition=getField(fieldId as PromptFieldId);
    if(definition.mode==="references")throw new Error("Input images must be added through the visible reference editor.");
    const known=new Set(definition.options.map(option=>option.id));
    const unknown=values.find(value=>!known.has(value));
    if(unknown)throw new Error(`Unknown ${definition.label} option: ${unknown}`);
    if((definition.mode==="single"||definition.mode==="text")&&values.length>1)throw new Error(`${definition.label} accepts one choice.`);
    for(const subgroup of exclusiveSubgroups){const count=values.filter(value=>definition.options.find(option=>option.id===value)?.subgroup===subgroup).length;if(count>1)throw new Error(`${definition.label} accepts one ${subgroup.toLowerCase()} choice.`);}
  }
  for(const [fieldId,values] of Object.entries(input.custom??{})){
    if(!promptFieldIds.includes(fieldId as PromptFieldId))throw new Error(`Unknown custom prompt field: ${fieldId}`);
    if(values.some(value=>!value.trim()))throw new Error(`Custom ${fieldId} values cannot be empty.`);
  }
  return input;
}

function ReferencePreview({ asset }:{asset:ReferenceAsset}) {
  const [url,setUrl]=useState("");
  useEffect(()=>{ const next=URL.createObjectURL(asset.blob); setUrl(next); return()=>URL.revokeObjectURL(next); },[asset.blob]);
  return url ? <img src={url} alt={`Preview of ${asset.fileName}`} className="h-full w-full object-cover" /> : <FileImage aria-hidden="true" />;
}

function OutputPanel({ brief, prompt, warnings }:{brief:string;prompt:string;warnings:ReturnType<typeof composeRecipe>["warnings"]}) {
  const copy = async (label:string,value:string) => {
    try { await navigator.clipboard.writeText(value); toast.success(`${label} copied`); }
    catch { toast.error(`Could not copy ${label.toLowerCase()}. Check browser clipboard permission.`); }
  };
  return (
    <section className="output-panel" aria-label="Generated output">
      <div className="output-head">
        <div><p className="eyebrow">Live output</p><h2>Your imagegen handoff</h2></div>
        <Badge variant="secondary"><Check /> Synced</Badge>
      </div>
      {warnings.length>0 && <div className="warning-stack" aria-live="polite">{warnings.map(w=><div className="warning" key={w.id}><AlertTriangle aria-hidden="true"/><div><strong>{w.title}</strong><p>{w.message}</p></div></div>)}</div>}
      <Tabs defaultValue="prompt" className="output-tabs">
        <TabsList className="w-full"><TabsTrigger value="brief">Brief</TabsTrigger><TabsTrigger value="prompt">Prompt</TabsTrigger></TabsList>
        <TabsContent value="brief">
          <div className="output-toolbar"><span>Readable art direction</span><Button size="sm" variant="outline" onClick={()=>copy("Brief",brief)}><Copy/>Copy brief</Button></div>
          <pre className="output-copy">{brief}</pre>
        </TabsContent>
        <TabsContent value="prompt">
          <div className="output-toolbar"><span>Ready for Codex</span><Button size="sm" variant="outline" onClick={()=>copy("Prompt",prompt)}><Copy/>Copy prompt</Button></div>
          <pre className="output-copy prompt-copy">{prompt}</pre>
        </TabsContent>
      </Tabs>
    </section>
  );
}

type FieldCardProps = {
  field:PromptFieldDefinition; draft:RecipeDraft; customLibrary:CustomOption[];
  onToggle:(field:PromptFieldDefinition,option:ChoiceOption)=>void;
  onAddCustom:(fieldId:PromptFieldId,value:string)=>void;
  onRemoveCustom:(fieldId:PromptFieldId,value:string)=>void;
  onDeleteLibrary:(option:CustomOption)=>void;
  onExactText:(value:string)=>void;
  children?:React.ReactNode;
};

function FieldCard({field,draft,customLibrary,onToggle,onAddCustom,onRemoveCustom,onDeleteLibrary,onExactText,children}:FieldCardProps) {
  const [expanded,setExpanded]=useState(false);
  const [detail,setDetail]=useState<ChoiceOption|undefined>();
  const [customValue,setCustomValue]=useState("");
  const assetType=draft.selections.assetType?.[0];
  const selected=draft.selections[field.id]??[];
  const options=useMemo(()=>[...field.options].sort((a,b)=>{const chosen=Number(selected.includes(b.id))-Number(selected.includes(a.id));return chosen||Number(Boolean(b.compatibleAssetTypes?.includes(assetType)))-Number(Boolean(a.compatibleAssetTypes?.includes(assetType)));}),[field.options,assetType,selected]);
  const shown=expanded?options:options.slice(0,6);
  const fieldLibrary=customLibrary.filter(item=>item.fieldId===field.id);
  const custom=draft.custom[field.id]??[];
  const add=()=>{ const value=customValue.trim(); if(!value)return; onAddCustom(field.id,value); setCustomValue(""); };
  return (
    <section className="field-card" id={`field-${field.id}`} aria-labelledby={`${field.id}-title`}>
      <header className="field-card-head">
        <div className="step-number">{promptFieldIds.indexOf(field.id)+1}</div>
        <div><h2 id={`${field.id}-title`}>{field.label}</h2><p>{field.description}</p></div>
        <span className="selection-count">{field.id==="inputImages"?draft.references.length:selected.length+custom.length} selected</span>
      </header>
      {field.id==="primaryRequest" && <div className="request-preview"><Sparkles aria-hidden="true"/><span>{composePrimaryRequest(draft)}</span></div>}
      {field.options.length>0 && <div className="choice-groups">
        {[...new Set(shown.map(option=>option.subgroup||"Choices"))].map(group=><div key={group} className="choice-group">
          {field.mode==="structured" && <p className="choice-group-label">{group}</p>}
          <div className="choice-grid">{shown.filter(option=>(option.subgroup||"Choices")===group).map(option=>{
            const active=selected.includes(option.id); const suggested=Boolean(option.compatibleAssetTypes?.includes(assetType));
            return <button type="button" key={option.id} className={`choice ${active?"choice-active":""}`} aria-pressed={active} onFocus={()=>setDetail(option)} onMouseEnter={()=>setDetail(option)} onClick={()=>{onToggle(field,option);setDetail(option)}}>
              <span>{option.label}</span>{suggested&&<small>Suggested</small>}{active&&<Check aria-hidden="true"/>}
            </button>;
          })}</div>
        </div>)}
      </div>}
      {options.length>6 && <Button type="button" variant="ghost" size="sm" className="more-button" onClick={()=>setExpanded(v=>!v)}>{expanded?"Show common choices":"More choices"}<ChevronDown className={expanded?"rotate-180":""}/></Button>}
      {field.id!=="inputImages" && field.id!=="exactText" && <div className="custom-box">
        <label htmlFor={`custom-${field.id}`}>Add your own wording</label>
        <div className="custom-input"><Input id={`custom-${field.id}`} value={customValue} onChange={e=>setCustomValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}} placeholder={`Custom ${field.shortLabel.toLowerCase()}…`}/><Button type="button" variant="outline" onClick={add}><Plus/>Add</Button></div>
        {(custom.length>0||fieldLibrary.length>0)&&<div className="custom-chips">
          {custom.map(value=><button type="button" className="custom-chip custom-chip-active" key={value} onClick={()=>onRemoveCustom(field.id,value)}>{value}<X/><span className="sr-only">Remove</span></button>)}
          {fieldLibrary.filter(item=>!custom.includes(item.value)).map(item=><span className="library-chip" key={item.id}><button type="button" onClick={()=>onAddCustom(field.id,item.value)}>+ {item.value}</button><button type="button" aria-label={`Delete ${item.value} from My options`} onClick={()=>onDeleteLibrary(item)}><X/></button></span>)}
        </div>}
      </div>}
      {field.id==="exactText" && selected.includes("include-text") && <div className="exact-text"><label htmlFor="exact-copy">Text to render, copied exactly</label><Textarea id="exact-copy" value={draft.exactText} onChange={e=>onExactText(e.target.value)} placeholder="Enter the exact spelling, capitalization, and punctuation…"/></div>}
      {children}
      {detail && <aside className="detail-panel" aria-live="polite">
        <div className="detail-icon"><Info aria-hidden="true"/></div><div><div className="detail-title"><strong>{detail.label}</strong><Badge variant="outline">{detail.artistTerm}</Badge></div><p>{detail.description}</p><p><span>Useful for:</span> {detail.usefulFor}</p></div>
        <div className="sample-placeholder"><FileImage/><span>Sample slot</span></div>
      </aside>}
    </section>
  );
}

function ReferenceEditor({draft,onChange}:{draft:RecipeDraft;onChange:(references:ReferenceAsset[])=>void}) {
  const input=useRef<HTMLInputElement>(null);
  const addFiles=(files:File[])=>{
    try {
      const combined=[...draft.references.map(r=>new File([r.blob],r.fileName,{type:r.mimeType})),...files];
      if(combined.length>4)throw new Error("A recipe can contain at most four reference images.");
      validateReferenceFiles(combined);
      const next=[...draft.references,...files.map((file,index)=>({id:crypto.randomUUID(),order:draft.references.length+index,role:"identity and anatomy" as const,fileName:file.name,mimeType:file.type,size:file.size,useFor:"match the relevant design details",doNotCopy:"",blob:file}))];
      onChange(next); toast.success(`${files.length} reference image${files.length===1?"":"s"} added`);
    } catch(error){toast.error(error instanceof Error?error.message:"Could not add those images.");}
  };
  const update=(id:string,patch:Partial<ReferenceAsset>)=>onChange(draft.references.map(r=>r.id===id?{...r,...patch}:r));
  const move=(index:number,direction:-1|1)=>{const next=[...draft.references];const target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];onChange(next.map((r,i)=>({...r,order:i})));};
  return <div className="reference-editor">
    <input ref={input} className="sr-only" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e=>{addFiles(Array.from(e.target.files??[]));e.target.value=""}}/>
    <button type="button" className="upload-zone" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(Array.from(e.dataTransfer.files))}}>
      <ImagePlus/><span><strong>Add reference images</strong><small>PNG, JPEG, or WebP · 10 MB each · 30 MB total</small></span><Badge variant="outline">{draft.references.length}/4</Badge>
    </button>
    {draft.references.map((reference,index)=><article className="reference-card" key={reference.id}>
      <div className="reference-thumb"><ReferencePreview asset={reference}/><span>Image {index+1}</span></div>
      <div className="reference-fields">
        <label>Role<NativeSelect className="w-full" value={reference.role} onChange={e=>update(reference.id,{role:e.target.value as ReferenceAsset["role"]})}>{referenceRoles.map(role=><NativeSelectOption key={role} value={role}>{role}</NativeSelectOption>)}</NativeSelect></label>
        <label>Use this for<Input value={reference.useFor} onChange={e=>update(reference.id,{useFor:e.target.value})}/></label>
        <label>Do not copy <span>(optional)</span><Input value={reference.doNotCopy} onChange={e=>update(reference.id,{doNotCopy:e.target.value})}/></label>
      </div>
      <div className="reference-actions"><Button type="button" variant="ghost" size="icon-sm" onClick={()=>move(index,-1)} disabled={index===0} aria-label="Move image up"><ArrowUp/></Button><Button type="button" variant="ghost" size="icon-sm" onClick={()=>move(index,1)} disabled={index===draft.references.length-1} aria-label="Move image down"><ArrowDown/></Button><Button type="button" variant="ghost" size="icon-sm" onClick={()=>onChange(draft.references.filter(r=>r.id!==reference.id).map((r,i)=>({...r,order:i})))} aria-label="Remove image"><Trash2/></Button></div>
    </article>)}
  </div>;
}

export default function Home(){
  const {watch,setValue,reset,getValues}=useForm<RecipeDraft>({defaultValues:createDraft()});
  const draft=watch();
  const [name,setName]=useState("Untitled character brief");
  const [current,setCurrent]=useState<RecipeV2|undefined>();
  const [recipes,setRecipes]=useState<RecipeV2[]>([]);
  const [customLibrary,setCustomLibrary]=useState<CustomOption[]>([]);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState<RecipeV2|undefined>();
  const [dirty,setDirty]=useState(false);
  const importInput=useRef<HTMLInputElement>(null);
  const draftRef=useRef(draft); draftRef.current=draft;
  const output=useMemo(()=>composeRecipe(draft),[draft]);
  const refresh=useCallback(async()=>{try{const [r,c]=await Promise.all([listRecipes(),listCustomOptions()]);setRecipes(r);setCustomLibrary(c);}catch{toast.error("Browser storage is unavailable in this context.");}},[]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{const before=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);},[dirty]);
  const update=(key:string,value:string[])=>{setValue(`selections.${key}`,value,{shouldDirty:true});setDirty(true);};
  const toggle=(f:PromptFieldDefinition,o:ChoiceOption)=>{const currentValues=draft.selections[f.id]??[];if(f.mode==="single"||f.mode==="text")return update(f.id,[o.id]);if(f.mode==="multi")return update(f.id,currentValues.includes(o.id)?currentValues.filter(id=>id!==o.id):[...currentValues,o.id]);const subgroup=o.subgroup;const others=subgroup&&exclusiveSubgroups.has(subgroup)?currentValues.filter(id=>getField(f.id).options.find(candidate=>candidate.id===id)?.subgroup!==subgroup):currentValues;update(f.id,currentValues.includes(o.id)?currentValues.filter(id=>id!==o.id):[...others,o.id]);};
  const addCustom=async(fieldId:PromptFieldId,value:string)=>{if((draft.custom[fieldId]??[]).includes(value))return;setValue(`custom.${fieldId}`,[...(draft.custom[fieldId]??[]),value]);setDirty(true);if(!customLibrary.some(o=>o.fieldId===fieldId&&o.value.toLowerCase()===value.toLowerCase())){const option={id:crypto.randomUUID(),fieldId,value,createdAt:new Date().toISOString()};try{await saveCustomOption(option);setCustomLibrary(items=>[...items,option]);}catch{toast.error("The option was added to this draft but could not be saved to My options.");}}};
  const removeCustom=(fieldId:PromptFieldId,value:string)=>{setValue(`custom.${fieldId}`,(draft.custom[fieldId]??[]).filter(v=>v!==value));setDirty(true);};
  const removeLibrary=async(option:CustomOption)=>{try{await deleteCustomOption(option.id);setCustomLibrary(items=>items.filter(i=>i.id!==option.id));toast.success("Removed from My options");}catch{toast.error("Could not remove that saved option.");}};
  const assertReferences=()=>{if(draft.references.some(r=>!r.useFor.trim()))throw new Error("Every reference image needs a “Use this for” instruction.");};
  const persist=useCallback(async(override?:{draft?:RecipeDraft;name?:string;existing?:RecipeV2})=>{const targetDraft=override?.draft??draftRef.current;const targetName=override?.name??name;const targetExisting=override?.existing??current;if(targetDraft.references.some(r=>!r.useFor.trim()))throw new Error("Every reference image needs a “Use this for” instruction.");const recipe=draftToRecipe(targetDraft,targetName,targetExisting);await saveRecipe(recipe,targetDraft);setCurrent(recipe);setName(recipe.name);setDirty(false);await refresh();return recipe;},[name,current,refresh]);
  const handleSave=async()=>{try{const recipe=await persist();toast.success(`Saved “${recipe.name}”`);return recipe;}catch(error){toast.error(error instanceof Error?error.message:"Could not save this recipe.");throw error;}};
  const newRecipe=()=>{if(dirty&&!window.confirm("Start a new recipe and discard unsaved changes?"))return;reset(createDraft());setName("Untitled character brief");setCurrent(undefined);setDirty(false);window.scrollTo({top:0,behavior:"smooth"});};
  const load=async(recipe:RecipeV2)=>{if(dirty&&!window.confirm("Load this recipe and discard unsaved changes?"))return;try{const stored=await getRecipe(recipe.id);if(!stored.recipe)throw new Error("Recipe not found.");reset(recipeToDraft(stored.recipe,stored.assets));setName(stored.recipe.name);setCurrent(stored.recipe);setDirty(false);setLibraryOpen(false);toast.success(`Loaded “${stored.recipe.name}”`);}catch(error){toast.error(error instanceof Error?error.message:"Could not load that recipe.");}};
  const duplicate=async(recipe:RecipeV2)=>{try{const stored=await getRecipe(recipe.id);if(!stored.recipe)throw new Error("Recipe not found.");const d=recipeToDraft(stored.recipe,stored.assets.map(a=>({...a,id:crypto.randomUUID()})));const copy=draftToRecipe(d,`${recipe.name} copy`);await saveRecipe(copy,d);await refresh();toast.success("Recipe duplicated");}catch(error){toast.error(error instanceof Error?error.message:"Could not duplicate that recipe.");}};
  const rename=async(recipe:RecipeV2)=>{const next=window.prompt("Recipe name",recipe.name)?.trim();if(!next||next===recipe.name)return;try{const stored=await getRecipe(recipe.id);if(!stored.recipe)return;const updated={...stored.recipe,name:next,updatedAt:new Date().toISOString()};await saveRecipe(updated,recipeToDraft(updated,stored.assets));if(current?.id===recipe.id){setCurrent(updated);setName(next);}await refresh();toast.success("Recipe renamed");}catch{toast.error("Could not rename that recipe.");}};
  const exportCurrent=async()=>{try{assertReferences();const recipe=draftToRecipe(draft,name,current);await exportRecipeBundle(recipe,draft);toast.success("ZIP exported");}catch(error){toast.error(error instanceof Error?error.message:"Could not export this recipe.");}};
  const importFile=async(file:File)=>{try{const result=await importRecipeBundle(file);reset(result.draft);setCurrent(result.recipe);setName(result.recipe.name);setDirty(false);await refresh();toast.success(`Imported “${result.recipe.name}”`);}catch(error){toast.error(error instanceof Error?error.message:"That ZIP could not be imported.");}};

  useEffect(()=>{const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();const report=()=>{};try{
    void Promise.resolve(context.registerTool({name:"configure_character_recipe",title:"Configure character recipe",description:"Validate structured field selections and update the visible Character Brief Studio draft.",inputSchema:{type:"object",properties:{selections:{type:"object",additionalProperties:{type:"array",items:{type:"string"}}},custom:{type:"object",additionalProperties:{type:"array",items:{type:"string"}}},exactText:{type:"string"}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){const parsed=validateConfiguration(configureInput.parse(input));const next={...draftRef.current,selections:{...draftRef.current.selections,...parsed.selections},custom:{...draftRef.current.custom,...parsed.custom},exactText:parsed.exactText??draftRef.current.exactText};reset(next);setDirty(true);const composed=composeRecipe(next);return {updated:true,prompt:composed.prompt,warnings:composed.warnings};}},{signal:lifecycle.signal})).catch(report);
    void Promise.resolve(context.registerTool({name:"read_current_imagegen_prompt",title:"Read current imagegen prompt",description:"Return the current brief, prompt, and warnings without changing the recipe.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){z.object({}).strict().parse(input);return composeRecipe(draftRef.current);}},{signal:lifecycle.signal})).catch(report);
    void Promise.resolve(context.registerTool({name:"save_current_recipe",title:"Save current recipe",description:"Save the current valid recipe in browser storage and return its ID and name.",inputSchema:{type:"object",properties:{name:{type:"string"}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){const parsed=z.object({name:z.string().min(1).optional()}).strict().parse(input);const recipe=await persist({name:parsed.name??name});return {id:recipe.id,name:recipe.name};}},{signal:lifecycle.signal})).catch(report);
  }catch{} return()=>lifecycle.abort();},[name,persist,reset]);

  return <div className="studio-shell">
    <Toaster position="bottom-right" richColors/>
    <header className="studio-header">
      <div className="brand"><div className="brand-mark"><Sparkles/></div><div><strong>Character Brief Studio</strong><span>Field-first imagegen recipe builder</span></div></div>
      <div className="header-actions">
        <Button variant="ghost" onClick={newRecipe}><RotateCcw/>New</Button>
        <Button variant="outline" onClick={()=>void handleSave()}><Save/>Save</Button>
        <Button variant="outline" onClick={()=>setLibraryOpen(true)}><FolderOpen/>Recipe Library</Button>
        <input ref={importInput} type="file" accept=".zip,application/zip" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file)void importFile(file);e.target.value=""}}/>
        <Button variant="outline" onClick={()=>importInput.current?.click()}><Upload/>Import</Button>
        <Button onClick={()=>void exportCurrent()}><Download/>Export</Button>
      </div>
    </header>
    <div className="workspace">
      <nav className="field-nav" aria-label="Prompt fields">
        <div className="nav-title"><p className="eyebrow">Recipe map</p><strong>Prompt fields</strong></div>
        {fieldDefinitions.map((field,index)=>{const count=field.id==="inputImages"?draft.references.length:(draft.selections[field.id]?.length??0)+(draft.custom[field.id]?.length??0);return <a href={`#field-${field.id}`} key={field.id}><span>{index+1}</span><span>{field.shortLabel}</span>{count>0&&<small>{count}</small>}</a>})}
        <div className="local-note"><Archive/><p><strong>Private by design</strong>Your recipes and images stay in this browser until you export a ZIP.</p></div>
      </nav>
      <main className="editor-column">
        <div className="document-title"><div><p className="eyebrow">Current recipe</p><h1>Shape every part of the request</h1><p>Choose what matters and leave the rest empty. Nothing is silently added or changed.</p></div><label>Recipe name<Input value={name} onChange={e=>{setName(e.target.value);setDirty(true)}}/></label></div>
        {fieldDefinitions.map(field=><FieldCard key={field.id} field={field} draft={draft} customLibrary={customLibrary} onToggle={toggle} onAddCustom={(id,value)=>void addCustom(id,value)} onRemoveCustom={removeCustom} onDeleteLibrary={item=>void removeLibrary(item)} onExactText={value=>{setValue("exactText",value);setDirty(true)}}>{field.id==="inputImages"&&<ReferenceEditor draft={draft} onChange={references=>{setValue("references",references);setDirty(true)}}/>}</FieldCard>)}
      </main>
      <aside className="preview-column"><OutputPanel {...output}/></aside>
    </div>
    <div className="mobile-output"><OutputPanel {...output}/></div>

    <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}><DialogContent className="library-dialog"><DialogHeader><DialogTitle>Recipe Library</DialogTitle><DialogDescription>Saved on this device, including attached reference images.</DialogDescription></DialogHeader>
      {recipes.length===0?<div className="empty-library"><Archive/><strong>No saved recipes yet</strong><p>Save the current recipe and it will appear here.</p></div>:<div className="recipe-list">{recipes.map(recipe=><article key={recipe.id}><div><strong>{recipe.name}</strong><span>{new Date(recipe.updatedAt).toLocaleString()} · {recipe.references.length} images</span></div><div><Button variant="ghost" size="sm" onClick={()=>void load(recipe)}><FolderOpen/>Open</Button><Button variant="ghost" size="icon-sm" aria-label="Duplicate recipe" onClick={()=>void duplicate(recipe)}><Copy/></Button><Button variant="ghost" size="icon-sm" aria-label="Rename recipe" onClick={()=>void rename(recipe)}><Info/></Button><Button variant="ghost" size="icon-sm" aria-label="Delete recipe" onClick={()=>setDeleteTarget(recipe)}><Trash2/></Button></div></article>)}</div>}
    </DialogContent></Dialog>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open=>{if(!open)setDeleteTarget(undefined)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle><AlertDialogDescription>This removes the saved recipe and its reference images from this browser. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>{if(deleteTarget)void deleteRecipe(deleteTarget.id).then(async()=>{if(current?.id===deleteTarget.id)setCurrent(undefined);await refresh();toast.success("Recipe deleted");}).catch(()=>toast.error("Could not delete that recipe."));setDeleteTarget(undefined)}}>Delete recipe</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

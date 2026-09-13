import { z } from "zod";

export const promptFieldIds = ["useCase","assetType","primaryRequest","inputImages","scene","subject","style","composition","lighting","palette","materials","exactText","constraints","avoid"] as const;
export type PromptFieldId = (typeof promptFieldIds)[number];
export type SelectionMode = "single" | "multi" | "structured" | "references" | "text";
export type ChoiceOption = { id:string; label:string; description:string; artistTerm:string; usefulFor:string; subgroup?:string; compatibleAssetTypes?:string[]; sampleAsset?:string };
export type PromptFieldDefinition = { id:PromptFieldId; label:string; shortLabel:string; description:string; mode:SelectionMode; options:ChoiceOption[] };
export type CustomOption = { id:string; fieldId:PromptFieldId; value:string; createdAt:string };

export const referenceRoles = ["edit target","identity and anatomy","costume and details","pose and composition","style and rendering","palette and lighting","environment","object to insert"] as const;
export type ReferenceRole = (typeof referenceRoles)[number];
export type ReferenceAsset = { id:string; order:number; role:ReferenceRole; fileName:string; mimeType:string; size:number; useFor:string; doNotCopy:string; blob:Blob };
export type RecipeReferenceMetadata = Omit<ReferenceAsset,"blob"> & { zipPath?:string };
export type RecipeDraft = { selections:Record<string,string[]>; custom:Record<string,string[]>; exactText:string; references:ReferenceAsset[] };
export type RecipeV2 = { schemaVersion:2; id:string; name:string; selections:Record<string,string[]>; custom:Record<string,string[]>; exactText:string; references:RecipeReferenceMetadata[]; createdAt:string; updatedAt:string };

type RawOption = [string,string,string,string,string,string?,string[]?];
const make = ([id,label,description,artistTerm,usefulFor,subgroup,compatibleAssetTypes]:RawOption):ChoiceOption => ({id,label,description,artistTerm,usefulFor,subgroup,compatibleAssetTypes});
const field = (id:PromptFieldId,label:string,description:string,mode:SelectionMode,raw:RawOption[],shortLabel=label):PromptFieldDefinition => ({id,label,shortLabel,description,mode,options:raw.map(make)});

export const fieldDefinitions:PromptFieldDefinition[] = [
  field("useCase","Use case","Tell imagegen what kind of job this is. This sets the broad generation behavior.","single",[
    ["stylized-concept","Stylized concept","Explore a designed character or creature.","stylized-concept","Most game character and creature concepts."],
    ["illustration-story","Story illustration","Show a character inside a narrative moment.","illustration-story","Scenes, comics, and story beats."],
    ["photorealistic-natural","Natural photo","Aim for believable photographic texture and light.","photorealistic-natural","Realistic people, costumes, and creatures."],
    ["identity-preserve","Preserve identity","Keep a person or character recognizably the same.","identity-preserve","Continuing an established character from a reference."],
    ["precise-object-edit","Precise edit","Change one clearly named part of an existing image.","precise-object-edit","Costume, prop, or feature replacement."],
    ["style-transfer","Transfer style","Apply the visual language of a reference to new content.","style-transfer","Matching an existing art direction."],
    ["compositing","Combine images","Merge subjects or objects from multiple references.","compositing","Placing a character or prop into another scene."],
    ["sketch-to-render","Sketch to render","Turn a drawing into a more finished image.","sketch-to-render","Developing line art without changing its layout."],
    ["lighting-weather","Change light or weather","Keep the design while changing atmosphere.","lighting-weather","Day/night, fog, rain, or relighting."],
    ["background-extraction","Remove background","Create a clean cutout with real transparency.","background-extraction","Icons, sprites, and isolated assets."],
    ["historical-scene","Historical scene","Prioritize a specific period and accurate details.","historical-scene","Period characters and grounded worldbuilding."],
    ["text-localization","Replace image text","Change visible words while preserving the design.","text-localization","Localized cards, posters, or sheets."],
  ]),
  field("assetType","Asset type","Choose the practical deliverable. This suggests relevant choices elsewhere but never changes them.","single",[
    ["portrait","Character portrait","A face-and-shoulders identity study.","bust portrait","Faces, identity, and expressions."],
    ["full-body","Full-body concept","An uncropped view of the entire design.","full-body character concept","Silhouette, costume, and proportions."],
    ["enemy","Enemy design","A gameplay-readable hostile character.","enemy character concept","Threat, role, and combat readability."],
    ["creature","Creature design","A non-human body plan and movement concept.","creature concept","Anatomy, scale, and locomotion."],
    ["lineup","Character lineup","Several related designs shown at one scale.","character lineup","Comparing variants or a cast."],
    ["turnaround","Turnaround sheet","The same design from several directions.","orthographic turnaround","3D modeling and consistency."],
    ["expressions","Expression sheet","The same face showing several emotions.","expression sheet","Animation and acting reference."],
    ["poses","Pose sheet","The same character performing several actions.","pose sheet","Movement and gameplay reference."],
    ["sprite","Sprite reference","A projection and motion guide for later sprite production.","sprite visual reference","Side-view, top-down, or isometric games."],
    ["model-sheet","Model sheet","Orthographic views plus focused details.","character model sheet","Production-ready proportion and material reference."],
  ],"Asset"),
  field("primaryRequest","Primary request","Build the main idea from four small decisions—no art-writing knowledge required.","structured",[
    ["humanoid","Humanoid","A person-shaped subject.","humanoid","Human, elf, robot, or upright fantasy designs.","Subject base"],
    ["beast","Beast","An animal-like subject.","beast","Quadrupeds and animal-inspired creatures.","Subject base"],
    ["hybrid","Hybrid","A subject combining distinct biological forms.","hybrid creature","Chimeras and mixed species.","Subject base"],
    ["protagonist","Protagonist","The main playable or story-leading figure.","protagonist","Hero-facing designs.","Role"],
    ["enemy","Enemy","A recurring hostile unit.","standard enemy","Gameplay opposition.","Role"],
    ["boss","Boss","A major high-threat encounter.","boss character","Memorable threat designs.","Role"],
    ["standing","Standing ready","A readable stance prepared for action.","ready pose","Clear silhouettes and equipment.","Action"],
    ["attacking","Attacking","Show a decisive offensive action.","attack pose","Combat energy and function.","Action"],
    ["casting","Casting","Use magic, technology, or a special ability.","casting pose","Ability-driven characters.","Action"],
    ["layered-gear","Layered gear","Build the design from visible clothing and equipment layers.","layered costume design","Travelers and soldiers.","Defining features"],
    ["distinct-silhouette","Distinct silhouette","Make the outer shape recognizable at a glance.","silhouette-first design","Game readability.","Defining features"],
    ["signature-prop","Signature prop","Give the subject one defining carried object.","hero prop","Communicating role and personality.","Defining features"],
  ],"Request"),
  field("inputImages","Input images","Attach up to four references and say exactly what each one should influence.","references",[],"Images"),
  field("scene","Scene / backdrop","Choose one main setting, then add atmosphere or time modifiers if useful.","structured",[
    ["transparent","Transparent","No visible background; preserve real alpha.","transparent background","Cutouts, icons, and sprites.","Main setting"],
    ["white","White studio","A clean white presentation surface.","seamless white studio backdrop","Sheets and production references.","Main setting"],
    ["mid-gray","Mid-gray studio","A neutral gray that keeps edges visible.","mid-gray studio backdrop","Concept presentation.","Main setting"],
    ["dark","Dark studio","A simple dark background with strong separation.","dark studio backdrop","Dramatic portraits.","Main setting"],
    ["environment-hint","Environment hint","Suggest a place without building a full scene.","minimal environmental vignette","Keeping attention on the design.","Main setting"],
    ["complete-environment","Complete environment","Place the subject in a fully developed location.","fully rendered environment","Story and scale context.","Main setting"],
    ["mist","Mist","Add soft haze and layered depth.","atmospheric mist","Mystery and depth.","Modifier"],
    ["rain","Rain","Add wet weather and surface response.","rainy atmosphere","Drama and material definition.","Modifier"],
    ["night","Night","Set the scene after dark.","night setting","Silhouette and artificial light.","Modifier"],
    ["dawn","Dawn","Use early light and a fresh atmosphere.","dawn setting","Hopeful or quiet scenes.","Modifier"],
  ]),
  field("subject","Subject","Describe the design’s body, proportions, personality, equipment, and condition.","multi",[
    ["athletic","Athletic build","Balanced strength and mobility.","athletic proportions","Agile fighters."],
    ["compact","Compact build","Short, dense proportions.","compact proportions","Sturdy designs."],
    ["elongated","Elongated build","Long limbs or an extended body plan.","elongated proportions","Uncanny or graceful silhouettes."],
    ["asymmetrical","Asymmetrical","Make the two sides intentionally different.","asymmetrical design","Damage, mutation, and interest."],
    ["armored","Armored","Protective plates define the design.","armored costume","Combat roles."],
    ["layered-clothing","Layered clothing","Several readable garment layers.","layered costume","Travelers and worldbuilding."],
    ["tool-bearing","Carries tools","Visible equipment explains the role.","occupational props","NPCs and specialists."],
    ["weathered","Weathered","Show wear from long use or exposure.","weathered condition","Experienced designs."],
    ["pristine","Pristine","Keep every surface clean and maintained.","pristine condition","Ceremonial or elite characters."],
    ["corrupted","Corrupted","Show a force visibly altering the subject.","corrupted design","Dark fantasy enemies."],
    ["regal","Regal bearing","Communicate controlled status and authority.","regal characterization","Leaders."],
    ["uncanny","Uncanny presence","Make familiar features subtly disturbing.","uncanny characterization","Horror creatures."],
  ]),
  field("style","Style / medium","Pick one main way the image is made, then add compatible rendering traits.","structured",[
    ["realistic-concept","Realistic concept painting","Believable forms painted for design clarity.","realistic concept painting","Grounded game development.","Primary medium",["full-body","enemy","creature","model-sheet"]],
    ["painterly-fantasy","Painterly fantasy","Visible brushwork with imaginative forms.","painterly fantasy illustration","Fantasy concepts.","Primary medium"],
    ["stylized-3d","Stylized 3D","Sculpted forms with simplified shapes.","stylized 3D render","Model-oriented concepts.","Primary medium"],
    ["cel-shaded","Cel-shaded","Clean color regions and graphic shadows.","cel-shaded illustration","Readable game art.","Primary medium"],
    ["graphic-ink","Graphic ink","Bold linework and strong black shapes.","graphic ink illustration","High-contrast designs.","Primary medium"],
    ["watercolor","Watercolor / gouache","Soft pigment variation and painted edges.","watercolor and gouache","Storybook concepts.","Primary medium"],
    ["pixel-art","Pixel art","Deliberate pixel clusters and limited detail.","pixel art","Retro game references.","Primary medium",["sprite"]],
    ["low-poly","Low-poly","Faceted geometry and economical shapes.","low-poly 3D render","Stylized 3D production.","Primary medium"],
    ["photorealistic","Photorealistic","Aim for real camera and surface behavior.","photorealistic rendering","Live-action visualization.","Rendering trait"],
    ["clean-linework","Clean linework","Use controlled outlines to explain forms.","clean production linework","Turnarounds and model sheets.","Rendering trait",["turnaround","model-sheet"]],
  ]),
  field("composition","Composition / framing","Control how much is visible, the viewpoint, camera angle, and sheet layout.","structured",[
    ["close-up","Close-up","Frame tightly around the face or detail.","close-up framing","Portraits and studies.","Framing",["portrait","expressions"]],
    ["bust","Bust length","Show head, shoulders, and upper torso.","bust-length framing","Character portraits.","Framing",["portrait"]],
    ["full-body","Full body","Keep the complete figure inside the frame.","full-body framing","Character concepts.","Framing",["full-body","enemy","creature"]],
    ["front","Front view","Look directly at the subject.","front view","Clear design reading.","Viewpoint"],
    ["three-quarter","Three-quarter view","Show front and side together.","three-quarter view","Depth and readable form.","Viewpoint"],
    ["profile","Profile","Show the subject directly from the side.","profile view","Silhouette and head shape.","Viewpoint"],
    ["eye-level","Eye level","Keep the camera level with the subject.","eye-level camera","Neutral presentation.","Camera angle"],
    ["low-angle","Low angle","Look upward to increase presence.","low-angle camera","Power and threat.","Camera angle"],
    ["high-angle","High angle","Look downward onto the subject.","high-angle camera","Vulnerability or overview.","Camera angle"],
    ["orthographic","Orthographic","Remove perspective distortion.","orthographic projection","Turnarounds and model sheets.","Layout",["turnaround","model-sheet"]],
    ["grid-3x2","3 × 2 grid","Arrange six consistent studies.","three-by-two study grid","Expressions and poses.","Layout",["expressions","poses"]],
    ["landscape-lineup","Landscape lineup","Place figures side by side at one scale.","same-scale landscape lineup","Comparing variants.","Layout",["lineup"]],
  ],"Framing"),
  field("lighting","Lighting / mood","Choose one lighting setup and any emotional tone you want it to carry.","structured",[
    ["neutral-studio","Neutral studio","Even light reveals the design accurately.","neutral studio lighting","Production sheets.","Lighting"],
    ["soft-diffuse","Soft diffuse","Broad gentle light with mild shadows.","soft diffuse lighting","Portraits.","Lighting"],
    ["dramatic-rim","Dramatic rim","A bright edge separates the silhouette.","dramatic rim lighting","Threat and silhouettes.","Lighting"],
    ["overhead","Overhead","Light falls strongly from above.","overhead lighting","Graphic planes.","Lighting"],
    ["backlit","Backlit silhouette","Most light comes from behind.","backlit silhouette","Mystery.","Lighting"],
    ["bioluminescent","Bioluminescent","The subject emits its own colored light.","bioluminescent lighting","Magical creatures.","Lighting"],
    ["heroic","Heroic","Confident, elevated, and aspirational.","heroic mood","Protagonists.","Mood"],
    ["ominous","Ominous","Suggest approaching danger.","ominous mood","Enemies.","Mood"],
    ["mysterious","Mysterious","Reveal enough to invite questions.","mysterious mood","Unknown characters.","Mood"],
    ["melancholic","Melancholic","Quietly sad and reflective.","melancholic mood","Narrative moments.","Mood"],
    ["playful","Playful","Light, energetic, and charming.","playful mood","Companions.","Mood"],
    ["brutal","Brutal","Harsh, forceful, and dangerous.","brutal mood","Bosses.","Mood"],
  ],"Light & mood"),
  field("palette","Color palette","Choose one overall color relationship, then add accent colors if needed.","structured",[
    ["warm","Warm","Favor reds, oranges, and warm yellows.","warm palette","Energy and heat.","Strategy"],
    ["cool","Cool","Favor blues, cyans, and cool greens.","cool palette","Calm and night.","Strategy"],
    ["muted","Muted","Reduce saturation for a grounded result.","muted palette","Weathered worlds.","Strategy"],
    ["monochrome","Monochrome","Build around one color family.","monochromatic palette","Graphic unity.","Strategy"],
    ["complementary","Complementary","Use opposing hues for clear contrast.","complementary color scheme","Readable accents.","Strategy"],
    ["jewel-toned","Jewel-toned","Use rich, saturated gem-like colors.","jewel-toned palette","Regal designs.","Strategy"],
    ["high-contrast","High contrast","Separate light and dark values strongly.","high-contrast value palette","Small-scale readability.","Strategy"],
    ["red-accent","Red accent","Reserve red for a focused signal.","red accent color","Threat details.","Accent"],
    ["cyan-accent","Cyan accent","Use cyan as a controlled luminous note.","cyan accent color","Technology or magic.","Accent"],
    ["gold-accent","Gold accent","Use gold for selected status details.","gold accent color","Regal designs.","Accent"],
  ],"Color"),
  field("materials","Materials / textures","Name surfaces the image should make physically readable.","multi",[
    ["skin","Skin","Natural or stylized living skin.","skin texture","Humanoids."],
    ["fur","Fur","Hair-like animal covering.","fur rendering","Beasts."],
    ["feathers","Feathers","Layered plumage with directional flow.","feather structure","Birdlike designs."],
    ["scales","Scales","Overlapping protective skin plates.","scale pattern","Reptilian creatures."],
    ["chitin","Chitin","Hard insect-like shell material.","chitinous carapace","Insectoid designs."],
    ["bone","Bone","Dry organic hard structure.","bone texture","Undead and armor."],
    ["cloth","Cloth","Woven soft fabric with folds.","woven cloth","Costumes."],
    ["leather","Leather","Flexible hide with creases and wear.","worn leather","Travel gear."],
    ["wood","Wood","Visible grain and carved surfaces.","wood grain","Nature props."],
    ["stone","Stone","Heavy mineral surfaces with chips and grain.","stone texture","Golems."],
    ["metal","Metal","Reflective or weathered forged surfaces.","metal material definition","Armor and robots."],
    ["energy","Smoke / energy","Non-solid luminous or vaporous forms.","volumetric smoke and energy","Elementals."],
  ]),
  field("exactText","Exact text","Choose no text, or enter the exact words that must appear. Text is copied verbatim.","text",[
    ["no-text","No text","Ask for an image without visible words.","no typography","Most character artwork."],
    ["include-text","Include exact text","Render only the words you supply.","verbatim in-image typography","Labels and title cards."],
  ],"Text"),
  field("constraints","Constraints","State requirements that must survive generation or editing.","multi",[
    ["one-subject","One subject","Do not introduce additional characters.","single-subject constraint","Focused designs."],
    ["full-figure","Entire figure visible","Keep every part of the body inside the frame.","uncropped full figure","Full-body concepts."],
    ["readable-silhouette","Readable silhouette","Keep the outer shape clear at a glance.","silhouette readability","Game assets."],
    ["consistent-identity","Consistent identity","Keep face, proportions, outfit, and personality stable.","identity lock","Sheets."],
    ["consistent-scale","Consistent scale","Show compared figures at the same relative size.","same-scale presentation","Lineups."],
    ["uniform-light","Uniform lighting","Use the same neutral light across views.","uniform lighting","Production reference."],
    ["no-perspective","No perspective distortion","Keep measurements visually comparable.","orthographic consistency","Turnarounds."],
    ["transparent-alpha","Real transparency","Produce genuine alpha, not a checkerboard.","transparent alpha output","Cutouts."],
    ["preserve-layout","Preserve layout","Do not change the established arrangement.","layout invariant","Edits."],
    ["production-clarity","Production clarity","Favor usable information over cinematic effects.","production-readable rendering","Sheets."],
  ],"Must keep"),
  field("avoid","Avoid","Call out common failure modes and anything the result should exclude.","multi",[
    ["extra-limbs","Extra limbs","Avoid accidental duplicate appendages.","no duplicated anatomy","Characters."],
    ["cropping","Accidental cropping","Do not cut off important anatomy or props.","no unintended crop","Full-body assets."],
    ["busy-background","Busy background","Keep background detail from competing.","no background clutter","Design studies."],
    ["tiny-details","Unreadable tiny details","Avoid detail that disappears at scale.","no micro-detail noise","Game designs."],
    ["inconsistent-design","Inconsistent views","Do not redesign the subject between panels.","no cross-view drift","Sheets."],
    ["unrelated-props","Unrelated props","Do not invent unrequested objects.","no extraneous props","Controlled concepts."],
    ["extra-text","Extra text","Do not add words beyond the exact request.","no unrequested typography","Text images."],
    ["logos","Logos / trademarks","Exclude recognizable brands and marks.","no logos or trademarks","Original assets."],
    ["watermarks","Watermarks","Exclude signatures and watermark overlays.","no watermark","Final assets."],
    ["over-polish","Over-polished styling","Avoid losing useful information under effects.","no excessive post-processing","Production references."],
  ]),
];

export const assetRegistry:Record<string,string|undefined> = Object.fromEntries(fieldDefinitions.flatMap(f=>f.options.map(o=>[o.id,o.sampleAsset])));
export const initialSelections:Record<string,string[]> = { useCase:["stylized-concept"],assetType:["full-body"],primaryRequest:["humanoid","protagonist","standing","distinct-silhouette"],inputImages:[],scene:["mid-gray"],subject:[],style:["realistic-concept"],composition:["full-body","three-quarter","eye-level"],lighting:["neutral-studio"],palette:[],materials:["cloth","leather","metal"],exactText:["no-text"],constraints:["one-subject","full-figure","readable-silhouette"],avoid:["extra-limbs","logos","watermarks"] };
export function createDraft():RecipeDraft { return { selections:structuredClone(initialSelections),custom:Object.fromEntries(promptFieldIds.map(id=>[id,[]])),exactText:"",references:[] }; }
export function getField(id:PromptFieldId){ return fieldDefinitions.find(f=>f.id===id)!; }
export function getOption(fieldId:PromptFieldId,optionId:string){ return getField(fieldId).options.find(o=>o.id===optionId); }
function labelsFor(draft:RecipeDraft,fieldId:PromptFieldId){ return [...(draft.selections[fieldId]??[]).map(id=>getOption(fieldId,id)?.label).filter(Boolean) as string[],...(draft.custom[fieldId]??[])].filter(Boolean); }
function byGroup(draft:RecipeDraft,fieldId:PromptFieldId,subgroup:string){ return (draft.selections[fieldId]??[]).map(id=>getOption(fieldId,id)).filter(o=>o?.subgroup===subgroup).map(o=>o!.label); }
function natural(values:string[]){ return values.length<2?(values[0]??""):`${values.slice(0,-1).join(", ")} and ${values.at(-1)}`; }
export function composePrimaryRequest(draft:RecipeDraft){ const base=byGroup(draft,"primaryRequest","Subject base")[0],role=byGroup(draft,"primaryRequest","Role")[0],action=byGroup(draft,"primaryRequest","Action")[0],features=[...byGroup(draft,"primaryRequest","Defining features"),...(draft.custom.primaryRequest??[])]; const noun=[role,base].filter(Boolean).join(" "); return `Create ${/^[aeiou]/i.test(noun)?"an":"a"} ${noun||"character or creature"}${action?` ${action.toLowerCase()}`:""}${features.length?`, featuring ${natural(features).toLowerCase()}`:""}.`; }
export type ConflictWarning={id:string;title:string;message:string;fields:PromptFieldId[]};
export function detectConflicts(draft:RecipeDraft){ const has=(f:PromptFieldId,o:string)=>draft.selections[f]?.includes(o); const w:ConflictWarning[]=[]; if(has("style","pixel-art")&&has("style","photorealistic"))w.push({id:"pixel-photo",title:"Two rendering languages compete",message:"Pixel art simplifies forms into deliberate pixels, while photorealism asks for camera-like detail. Keep both only for an intentional hybrid.",fields:["style"]}); if(has("scene","transparent")&&has("scene","complete-environment"))w.push({id:"alpha-environment",title:"Background directions conflict",message:"A transparent cutout cannot also contain a complete environment. Imagegen may choose one unpredictably.",fields:["scene","constraints"]}); if(has("composition","orthographic")&&(has("composition","low-angle")||has("composition","high-angle")))w.push({id:"ortho-angle",title:"Camera angle may distort the sheet",message:"Orthographic views are measurement-friendly; high or low camera angles introduce dramatic perspective.",fields:["composition"]}); if(has("exactText","no-text")&&!!draft.exactText.trim())w.push({id:"text-mode",title:"Exact text is currently excluded",message:"You entered words while “No text” is selected. Choose “Include exact text” if those words should appear.",fields:["exactText"]}); if(has("assetType","turnaround")&&!has("composition","orthographic"))w.push({id:"turnaround-ortho",title:"Turnarounds usually need orthographic views",message:"Consider adding Orthographic so front, side, and rear proportions stay comparable.",fields:["assetType","composition"]}); return w; }
export function composeRecipe(draft:RecipeDraft){ const refs=[...draft.references].sort((a,b)=>a.order-b.order); const images=refs.map((r,i)=>[`Image ${i+1}: ${r.role}`,`use it for ${r.useFor.trim()}`,r.doNotCopy.trim()?`do not copy ${r.doNotCopy.trim()}`:""].filter(Boolean).join("; ")); const useCase=draft.selections.useCase?.[0],useCaseNotes=draft.custom.useCase??[],assetTypes=labelsFor(draft,"assetType"),assetType=assetTypes.join("; "),primary=composePrimaryRequest(draft); const line=(label:string,values:string[])=>values.length?`${label}: ${values.join("; ")}`:""; const text=draft.selections.exactText?.includes("include-text")&&draft.exactText.trim()?`Text (verbatim): ${JSON.stringify(draft.exactText)}`:""; const prompt=["$imagegen","",useCase?`Use case: ${useCase}${useCaseNotes.length?`; custom guidance: ${useCaseNotes.join("; ")}`:""}`:"",assetType?`Asset type: ${assetType}`:"",`Primary request: ${primary}`,images.length?`Input images: ${images.join(". ")}.`:"",line("Scene/backdrop",labelsFor(draft,"scene")),line("Subject",labelsFor(draft,"subject")),line("Style/medium",labelsFor(draft,"style")),line("Composition/framing",labelsFor(draft,"composition")),line("Lighting/mood",labelsFor(draft,"lighting")),line("Color palette",labelsFor(draft,"palette")),line("Materials/textures",labelsFor(draft,"materials")),text,line("Constraints",labelsFor(draft,"constraints")),line("Avoid",labelsFor(draft,"avoid"))].filter((v,i)=>i<2||!!v).join("\n"); const sections:[[string,string],...[string,string][]]=[["Purpose",[useCase,...useCaseNotes,assetType].filter(Boolean).join(" — ")],["Main idea",primary],["Reference images",images.join("\n")],["Scene and backdrop",labelsFor(draft,"scene").join("; ")],["Character or creature",labelsFor(draft,"subject").join("; ")],["Visual style",labelsFor(draft,"style").join("; ")],["Framing",labelsFor(draft,"composition").join("; ")],["Light and feeling",labelsFor(draft,"lighting").join("; ")],["Color",labelsFor(draft,"palette").join("; ")],["Surfaces",labelsFor(draft,"materials").join("; ")],["Exact words",text?draft.exactText:"No visible text"],["Must keep",labelsFor(draft,"constraints").join("; ")],["Must avoid",labelsFor(draft,"avoid").join("; ")]]; const brief=[`# ${assetType||"Untitled image brief"}`,"",...sections.filter(([,c])=>!!c).flatMap(([h,c])=>[`## ${h}`,c,""])].join("\n").trim(); return {prompt,brief,warnings:detectConflicts(draft)}; }
const arrays=z.record(z.array(z.string()));
const referenceSchema=z.object({id:z.string(),order:z.number().int().min(0).max(3),role:z.enum(referenceRoles),fileName:z.string().min(1),mimeType:z.enum(["image/png","image/jpeg","image/webp"]),size:z.number().nonnegative().max(10*1024*1024),useFor:z.string().min(1),doNotCopy:z.string(),zipPath:z.string().optional()});
export const recipeImportSchema=z.object({schemaVersion:z.literal(2),id:z.string(),name:z.string().min(1),selections:arrays,custom:arrays,exactText:z.string(),references:z.array(referenceSchema).max(4),createdAt:z.string(),updatedAt:z.string()});
export function draftToRecipe(draft:RecipeDraft,name:string,existing?:RecipeV2):RecipeV2{ const now=new Date().toISOString(); return {schemaVersion:2,id:existing?.id??crypto.randomUUID(),name:name.trim()||"Untitled character brief",selections:structuredClone(draft.selections),custom:structuredClone(draft.custom),exactText:draft.exactText,references:draft.references.map(({blob:_blob,...meta})=>meta),createdAt:existing?.createdAt??now,updatedAt:now}; }
export function recipeToDraft(recipe:RecipeV2,assets:ReferenceAsset[]):RecipeDraft{ return {selections:structuredClone(recipe.selections),custom:structuredClone(recipe.custom),exactText:recipe.exactText,references:assets}; }

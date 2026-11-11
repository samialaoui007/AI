export type ProviderId='kie'|'cometapi';
export type MediaType='image'|'video'|'merge';
export const MODELS = [
{ canonical:'gpt-image-2-6/flare-text-to-image',aliases:['gpt-image-2.6/flare-text-to-image'],type:'image' as const,providers:['kie'] as ProviderId[],providerModel:{kie:process.env.KIE_IMAGE_MODEL||'gpt-image-2-6/flare-text-to-image'} },
{ canonical:'grok-imagine-video-1-5-preview',aliases:['grok-imagine-video-1.5-preview'],type:'video' as const,providers:['kie'] as ProviderId[],providerModel:{kie:process.env.KIE_VIDEO_MODEL||'grok-imagine-video-1-5-preview'} }
];
// لا نعلن دعم CometAPI إلى أن يتم التحقق من مسارات API الخاصة بالموديلات.
export function resolveModel(value:string){return MODELS.find(m=>m.canonical===value||m.aliases.includes(value))}

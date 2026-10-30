// Preserve the explicitly declared encoding of older agency websites.
export function decodeLegacyHtml(bytes:Uint8Array,contentType=''){
 const preview=new TextDecoder('windows-1252').decode(bytes.slice(0,4096));
 const charset=(contentType.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1]||preview.match(/charset\s*=\s*["']?([^\s;"'<>/]+)/i)?.[1]||'utf-8').toLowerCase();
 try{return new TextDecoder(charset).decode(bytes);}catch{return new TextDecoder().decode(bytes);}
}

// Preserve the explicitly declared encoding of older agency websites.
export function decodeLegacyHtml(bytes:Uint8Array,contentType=''){
 const preview=new TextDecoder('windows-1252').decode(bytes.slice(0,4096));
 const charset=(contentType.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1]||preview.match(/charset\s*=\s*["']?([^\s;"'<>/]+)/i)?.[1]||'utf-8').toLowerCase();
 let out:string;try{out=new TextDecoder(charset).decode(bytes);}catch{out=new TextDecoder().decode(bytes);}
 // 02/11/2026 (Crefimo / Adapt'immo : en-tête « utf-8 » mais page en windows-1252 → « Asni�res ») : caractères illisibles → charset de la page.
 if(/^utf-?8$/.test(charset)&&(out.match(/\uFFFD/g)||[]).length>3){const meta=preview.match(/<meta[^>]+charset\s*=\s*["']?([^\s;"'<>/]+)/i)?.[1]?.toLowerCase();try{out=new TextDecoder(meta&&!/^utf-?8$/.test(meta)?meta:'windows-1252').decode(bytes);}catch{}}
 return out;
}

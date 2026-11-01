// 01/11/2026 — Claude : compteur du temps de calcul passé à lire les pages pendant une requête.
// La plateforme coupe le robot (erreur 503) au-delà d'environ 2 s de calcul : on s'arrête avant, lecture partielle reprise au passage suivant.
export const cpu={ms:0};
export const CPU_BUDGET_MS=1000;
export const cpuLeft=()=>cpu.ms<CPU_BUDGET_MS;
export const cpuReset=()=>{cpu.ms=0;};

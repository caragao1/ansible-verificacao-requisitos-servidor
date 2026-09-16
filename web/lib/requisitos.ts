export interface FaixaRequisitos {
  maxDispositivos: number;
  cpuMin: number;
  discoMinGb: number;
  ramMinGb: number;
}

// Mesma tabela usada no playbook Ansible (verificacao-requisitos/vars/requisitos.yml).
export const TABELA_REQUISITOS: FaixaRequisitos[] = [
  { maxDispositivos: 1000, cpuMin: 4, discoMinGb: 40, ramMinGb: 12 },
  { maxDispositivos: 3000, cpuMin: 8, discoMinGb: 80, ramMinGb: 16 },
  { maxDispositivos: 8000, cpuMin: 8, discoMinGb: 120, ramMinGb: 24 },
  { maxDispositivos: 15000, cpuMin: 12, discoMinGb: 180, ramMinGb: 40 },
  { maxDispositivos: 30000, cpuMin: 16, discoMinGb: 240, ramMinGb: 64 },
  { maxDispositivos: 100000, cpuMin: 24, discoMinGb: 500, ramMinGb: 124 },
];

export const TOLERANCIA_RAM = 0.95;

export function selecionarFaixa(dispositivos: number): FaixaRequisitos | null {
  const candidatas = TABELA_REQUISITOS.filter(
    (faixa) => faixa.maxDispositivos >= dispositivos
  ).sort((a, b) => a.maxDispositivos - b.maxDispositivos);
  return candidatas[0] ?? null;
}

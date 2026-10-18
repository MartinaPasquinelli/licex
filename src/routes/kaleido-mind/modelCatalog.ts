import type { CatalogModel, MindHardware } from '../../api/mind'

const STRONGER_DEFAULT_MODEL_ID = 'qwen3.5-4b-q4_k_m'

export function modelMemoryBudgetGb(hardware: MindHardware): number {
  const total = hardware.totalMemoryBytes / 1024 ** 3
  return Math.max(0, total - Math.max(2, total * 0.25))
}

export function getRecommendedModelId(
  catalog: CatalogModel[],
  hardware?: MindHardware | null
): string | undefined {
  const providerRecommended =
    catalog.find((model) => model.recommended) ?? catalog[0]
  const strongerDefault = catalog.find(
    (model) => model.id === STRONGER_DEFAULT_MODEL_ID
  )
  if (!hardware || hardware.totalMemoryBytes <= 0)
    return providerRecommended?.id ?? catalog[0]?.id

  const recommended = strongerDefault ?? providerRecommended
  const budget = modelMemoryBudgetGb(hardware)
  const fits = catalog.filter(
    (model) => model.ramHintGb > 0 && model.ramHintGb <= budget
  )
  return (
    fits.find((model) => model.id === recommended?.id)?.id ??
    fits.find((model) => model.id === providerRecommended?.id)?.id ??
    fits.sort((a, b) => b.ramHintGb - a.ramHintGb)[0]?.id
  )
}

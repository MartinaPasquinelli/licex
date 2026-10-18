import { describe, expect, it } from 'vitest'

import {
  buildEulaAnalysisPrompt,
  createEulaSourcePassages,
  parseEulaAiReview,
  type EulaSourcePassage,
} from './eula-ai-review'
import { EULA_SAMPLES } from './eula-samples'

const contract = `LICENSE AGREEMENT

The license may be transferred only with prior written approval.

Commercial use is permitted.`
const passages = createEulaSourcePassages(contract)

function responseFor(
  passageReferences: Partial<Record<string, string[]>> = {}
): string {
  return JSON.stringify({
    findings: [
      'transferability',
      'commercial_use',
      'drm_telemetry',
      'duration_termination',
      'seats_devices',
      'liability_warranty',
    ].map((topic) => {
      const sourceIds = passageReferences[topic] ?? []
      return {
        interpretation:
          sourceIds.length > 0
            ? 'Il passaggio descrive questa condizione contrattuale.'
            : 'Non individuato nei passaggi forniti.',
        sourceIds,
        status: sourceIds.length > 0 ? 'explicit' : 'not_found',
        topic,
      }
    }),
  })
}

describe('EULA local AI review', () => {
  it('builds bounded, numbered source passages and prompts the model to cite IDs', () => {
    const prompt = buildEulaAnalysisPrompt(passages)

    expect(passages.map(({ id }) => id)).toEqual(['p1', 'p2', 'p3'])
    expect(prompt).toContain('dato non attendibile')
    expect(prompt).toContain('"id":"p2"')
    expect(prompt).toContain('"sourceIds":["p3"]')
    expect(prompt).not.toContain('"evidence"')
  })

  it('returns source text from the original passages, not model-generated quotes', () => {
    const result = parseEulaAiReview(
      responseFor({
        commercial_use: ['p3'],
        transferability: ['p2'],
      }),
      passages
    )

    expect(result.findings).toHaveLength(6)
    expect(result.findings[0]).toMatchObject({
      evidence:
        'The license may be transferred only with prior written approval.',
      sourceIds: ['p2'],
      status: 'explicit',
      topic: 'transferability',
    })
    expect(result.findings[1].evidence).toBe('Commercial use is permitted.')
    expect(result.findings[2].status).toBe('not_found')
  })

  it('parses a JSON object wrapped in prose, Markdown, or model thinking', () => {
    const wrapped = `Reasoning: the {contract} is untrusted.
<think>{"findings": []}</think>
Here is the result:
\`\`\`json
${responseFor({ transferability: ['p2'] })}
\`\`\`
Done.`

    const result = parseEulaAiReview(wrapped, passages)
    expect(result.findings[0].evidence).toBe(passages[1].text)
  })

  it('finds findings inside common QVAC response envelopes', () => {
    const response = JSON.stringify({
      response: JSON.stringify({
        findings: JSON.parse(responseFor({ transferability: ['p2'] })).findings,
      }),
    })

    const result = parseEulaAiReview(response, passages)
    expect(result.findings[0].evidence).toBe(passages[1].text)
  })

  it('normalizes common field and topic aliases without relaxing source checks', () => {
    const normalized = JSON.stringify({
      result: {
        clauses: JSON.parse(
          responseFor({ transferability: ['p2'] })
        ).findings.map(
          (finding: {
            topic: string
            status: string
            interpretation: string
            sourceIds: string[]
          }) => ({
            category:
              finding.topic === 'transferability'
                ? 'transfer-policy'
                : finding.topic,
            evidence_ids: finding.sourceIds,
            reason: finding.interpretation,
            status: finding.status === 'explicit' ? 'found' : finding.status,
          })
        ),
      },
    })

    const result = parseEulaAiReview(normalized, passages)
    expect(result.findings[0]).toMatchObject({
      evidence: passages[1].text,
      status: 'explicit',
      topic: 'transferability',
    })
  })

  it('accepts a top-level array of clause findings', () => {
    const findings = JSON.parse(
      responseFor({ transferability: ['p2'] })
    ).findings

    const result = parseEulaAiReview(JSON.stringify(findings), passages)
    expect(result.findings[0].evidence).toBe(passages[1].text)
  })

  it('accepts an object keyed by topic when each topic has a valid finding', () => {
    const objectByTopic = Object.fromEntries(
      JSON.parse(responseFor({ transferability: ['p2'] })).findings.map(
        (finding: {
          topic: string
          status: string
          interpretation: string
          sourceIds: string[]
        }) => [
          finding.topic,
          {
            interpretation: finding.interpretation,
            sourceIds: finding.sourceIds,
            status: finding.status,
          },
        ]
      )
    )

    const result = parseEulaAiReview(
      JSON.stringify({ analysis: objectByTopic }),
      passages
    )
    expect(result.findings[0].evidence).toBe(passages[1].text)
  })

  it('rejects source references that are not in the supplied contract', () => {
    expect(() =>
      parseEulaAiReview(
        responseFor({ transferability: ['invented-passage'] }),
        passages
      )
    ).toThrow('passaggio sorgente inesistente')
  })

  it('rejects supported findings with no source references', () => {
    const validFindings = JSON.parse(responseFor()).findings
    validFindings[0] = {
      interpretation: 'È trasferibile.',
      sourceIds: [],
      status: 'explicit',
      topic: 'transferability',
    }

    expect(() =>
      parseEulaAiReview(JSON.stringify({ findings: validFindings }), passages)
    ).toThrow('non ha indicato passaggi sorgente')
  })

  it('rejects incomplete output rather than silently filling missing topics', () => {
    const incomplete = JSON.stringify({
      findings: JSON.parse(responseFor()).findings.slice(0, 1),
    })

    expect(() => parseEulaAiReview(incomplete, passages)).toThrow(
      'non ha valutato tutte le categorie'
    )
  })

  it('creates valid source references for each provided sample contract', () => {
    for (const sample of EULA_SAMPLES) {
      const samplePassages: EulaSourcePassage[] = createEulaSourcePassages(
        sample.text
      )
      expect(samplePassages.length, sample.id).toBeGreaterThan(0)
      expect(new Set(samplePassages.map(({ id }) => id)).size).toBe(
        samplePassages.length
      )

      const result = parseEulaAiReview(
        responseFor({ transferability: [samplePassages[0].id] }),
        samplePassages
      )
      expect(result.findings[0].evidence, sample.id).toBe(
        samplePassages[0].text
      )
    }
  })
})

// ─── QVAC Local EULA Analysis Engine ───────────────────────────────────────────
// Heuristic & Semantic parser executing 100% on-device.
// Extracts structured terms, cross-checks vendor compliance, identifies risks,
// and produces verified license listing suggestions.

import type { TransferPolicy, LicenseType } from '../../types/licex'
import type {
  EulaAnalysisResult,
  EulaClause,
  EulaExtractedMetadata,
  EulaComplianceAudit,
} from './eula-types'

export class QvacEulaAnalyzer {
  /**
   * Main entry point to analyze a raw EULA contract text.
   * Can optionally take a vendor's claimed transfer policy to perform a compliance audit.
   */
  public static analyze(
    rawText: string,
    claimedPolicy?: TransferPolicy
  ): EulaAnalysisResult {
    const startTime = performance.now()
    const text = rawText.trim()
    const lower = text.toLowerCase()

    // 1. Extract metadata
    const extracted = this.extractMetadata(text, lower)

    // 2. Extract specific grounded clauses with original snippets
    const clauses = this.extractClauses(text)

    // 3. Perform optional compliance cross-check
    const complianceAudit = this.performComplianceAudit(
      extracted.transferPolicy,
      claimedPolicy
    )

    // 4. Generate an executive summary in clear English
    const executiveSummary = this.generateExecutiveSummary(
      extracted,
      complianceAudit
    )

    // 5. Build suggested Marketplace listing
    const suggestedListing = this.buildSuggestedListing(
      extracted,
      executiveSummary
    )

    // 6. Calculate confidence score based on completeness of signals
    const confidenceScore = this.calculateConfidence(extracted, clauses)

    const processingTimeMs = Math.round(performance.now() - startTime)

    return {
      aiReviewStatus: complianceAudit.aiReviewStatus,
      analysisTimestamp: new Date().toISOString(),
      clauses,
      complianceAudit,
      confidenceScore,
      executiveSummary,
      extracted,
      id: `eula-${Date.now()}`,
      processingTimeMs,
      suggestedListing,
    }
  }

  // ── 1. Metadata Extraction ──────────────────────────────────────────────────
  private static extractMetadata(
    text: string,
    lower: string
  ): EulaExtractedMetadata {
    // Product Name and Edition heuristics
    let productName = 'Software License'
    let edition = 'Standard'
    let version = '1.0'

    // Look for lines like "Product Name (Edition / Version)"
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    for (const line of lines.slice(0, 8)) {
      if (
        !line.toLowerCase().includes('end user') &&
        !line.toLowerCase().includes('contratto di licenza') &&
        !line.toLowerCase().includes('terms of service') &&
        !line.toLowerCase().includes('agreement') &&
        line.length > 3 &&
        line.length < 60
      ) {
        // Remove trailing corporate designations for clean product title
        productName = line
          .replace(/^(CONTRATTO|EULA|AGREEMENT|TERMS)[^A-Za-z0-9]*/i, '')
          .trim()
        break
      }
    }

    // Specific matchers for versions
    const versionMatch = text.match(
      /(?:version|versione|v\.|rev\.)\s*([0-9]+(?:\.[0-9]+)*)/i
    )
    if (versionMatch?.[1]) {
      version = versionMatch[1]
    }

    // Specific matchers for editions
    if (lower.includes('pro') || lower.includes('professional'))
      edition = 'Professional'
    else if (lower.includes('enterprise')) edition = 'Enterprise'
    else if (lower.includes('studio')) edition = 'Studio Edition'
    else if (lower.includes('personal') || lower.includes('home'))
      edition = 'Personal'

    // License Type and Duration
    let licenseType: LicenseType = 'perpetual'
    let durationDays: number | null = null

    if (
      lower.includes('subscription') ||
      lower.includes('abbonamento') ||
      lower.includes('monthly') ||
      lower.includes('mensile') ||
      lower.includes('annuale')
    ) {
      licenseType = 'subscription'
      durationDays =
        lower.includes('monthly') || lower.includes('mensile') ? 30 : 365
    } else if (lower.includes('trial') || lower.includes('valutazione')) {
      licenseType = 'trial'
      durationDays = 14
    } else if (lower.includes('enterprise')) {
      licenseType = 'enterprise'
    } else if (lower.includes('educational') || lower.includes('accadem')) {
      licenseType = 'educational'
    }

    // Platforms
    const platforms: string[] = []
    if (lower.includes('windows')) platforms.push('Windows')
    if (
      lower.includes('macos') ||
      lower.includes('mac os') ||
      lower.includes('apple')
    )
      platforms.push('macOS')
    if (
      lower.includes('linux') ||
      lower.includes('ubuntu') ||
      lower.includes('debian')
    )
      platforms.push('Linux')
    if (platforms.length === 0) platforms.push('Cross-platform')

    // Seats allowed
    let seatsAllowed: number | 'unlimited' | 'unknown' = 1
    const seatsMatch = text.match(
      /(?:up to|massimo di|fino a|non pi[uù] di)\s*([0-9]+|\w+)\s*(?:\([0-9]+\))?\s*(?:computer|postazion|device|dispositiv|machine|seat)/i
    )
    if (seatsMatch?.[1]) {
      const parsed = parseInt(seatsMatch[1], 10)
      if (!isNaN(parsed)) seatsAllowed = parsed
      else if (/two|due/i.test(seatsMatch[1])) seatsAllowed = 2
      else if (/three|tre/i.test(seatsMatch[1])) seatsAllowed = 3
    } else if (lower.includes('unlimited') || lower.includes('illimitat')) {
      seatsAllowed = 'unlimited'
    }

    // Commercial use allowed
    const commercialUseAllowed = !(
      lower.includes('non-commercial') ||
      lower.includes('non commerciale') ||
      lower.includes('personal use only') ||
      lower.includes('solo uso personale') ||
      lower.includes('educational only')
    )

    // Online verification / telemetry
    const onlineVerificationRequired =
      lower.includes('telemetry') ||
      lower.includes('connect to our validation server') ||
      lower.includes('continuous internet access') ||
      lower.includes('heartbeat') ||
      lower.includes('verifica periodica')

    // Transfer policy determination
    const { transferPolicy, transferFeeMentioned, royaltyEstimatePercent } =
      this.determineTransferPolicy(lower, text)

    return {
      commercialUseAllowed,
      durationDays,
      edition,
      licenseType,
      onlineVerificationRequired,
      platforms,
      productName,
      royaltyEstimatePercent,
      seatsAllowed,
      transferFeeMentioned,
      transferPolicy,
      version,
    }
  }

  // ── 2. Transfer Policy Logic ────────────────────────────────────────────────
  private static determineTransferPolicy(
    lower: string,
    text: string
  ): {
    transferPolicy: TransferPolicy
    transferFeeMentioned: boolean
    royaltyEstimatePercent?: number
  } {
    let transferFeeMentioned = false
    let royaltyEstimatePercent: number | undefined

    // Check for fee mentions (e.g., 15%, fee, royalty)
    const feeMatch = text.match(
      /(?:fee|royalty|commissione|spese)\s*(?:of|pari al|del)?\s*([0-9]+)\s*%/i
    )
    if (feeMatch?.[1]) {
      transferFeeMentioned = true
      royaltyEstimatePercent = parseInt(feeMatch[1], 10)
    } else if (
      lower.includes('transfer fee') ||
      lower.includes('spesa di trasferimento')
    ) {
      transferFeeMentioned = true
      royaltyEstimatePercent = 10
    }

    // Check for explicit UsedSoft / Free resale rights
    const hasFreeTransferSignals =
      lower.includes('usedsoft') ||
      lower.includes('trasferimento libero') ||
      lower.includes('pleno diritto di cedere') ||
      lower.includes('pieno diritto di cedere') ||
      lower.includes('non è richiesta alcuna approvazione') ||
      (lower.includes('permanently transfer') &&
        !lower.includes('without prior written'))

    // Check for transfer with approval signals
    const hasApprovalSignals =
      lower.includes('written authorization') ||
      lower.includes('approval prior') ||
      lower.includes('previa approvazione') ||
      lower.includes('autorizzazione scritta') ||
      lower.includes('transfer request') ||
      transferFeeMentioned

    // Check for strict prohibitions
    const hasStrictProhibition =
      lower.includes('strictly prohibited') ||
      lower.includes('may not rent, lease, lend, sell') ||
      lower.includes('resale prohibited') ||
      (lower.includes('non-transferable') &&
        !hasApprovalSignals &&
        !hasFreeTransferSignals) ||
      (lower.includes('intrasferibile') &&
        !hasApprovalSignals &&
        !hasFreeTransferSignals) ||
      lower.includes('divieto assoluto di cessione')

    if (
      hasStrictProhibition &&
      !hasApprovalSignals &&
      !hasFreeTransferSignals
    ) {
      return { transferFeeMentioned: false, transferPolicy: 'not_transferable' }
    }

    if (hasFreeTransferSignals) {
      return {
        royaltyEstimatePercent,
        transferFeeMentioned,
        transferPolicy: 'transferable_free',
      }
    }

    if (hasApprovalSignals || lower.includes('may sell, assign, or transfer')) {
      return {
        royaltyEstimatePercent,
        transferFeeMentioned,
        transferPolicy: 'transferable_with_approval',
      }
    }

    // Default conservative fallback
    return { transferFeeMentioned: false, transferPolicy: 'not_transferable' }
  }

  // ── 3. Clause Extraction & Snippets ─────────────────────────────────────────
  private static extractClauses(text: string): EulaClause[] {
    const clauses: EulaClause[] = []
    const paragraphs = text
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.trim())
      .filter(Boolean)

    // Helper to find best paragraph matching keywords
    const findParagraph = (keywords: string[]): string | undefined => {
      return paragraphs.find((p) => {
        const pLower = p.toLowerCase()
        return keywords.some((k) => pLower.includes(k))
      })
    }

    // A. Transferability Clause
    const transferPara = findParagraph([
      'transfer',
      'resale',
      'rivendita',
      'cedere',
      'sublicense',
      'assign',
      'usedsoft',
      'intrasferibile',
    ])
    if (transferPara) {
      const pLow = transferPara.toLowerCase()
      const isForbidden =
        pLow.includes('prohibited') ||
        pLow.includes('vietat') ||
        pLow.includes('may not')
      const isApproval =
        pLow.includes('approval') ||
        pLow.includes('approvazione') ||
        pLow.includes('fee')

      clauses.push({
        category: 'transferability',
        id: 'clause-transfer',
        isAmbiguous: false,
        originalQuote:
          transferPara.slice(0, 320) + (transferPara.length > 320 ? '...' : ''),
        riskLevel: isForbidden ? 'danger' : isApproval ? 'warning' : 'safe',
        riskReason: isForbidden
          ? 'Impossibile rivendere su marketplace secondari senza incorrere in blocco dell’account.'
          : isApproval
            ? 'Richiede coordinamento bilaterale con il produttore prima di completare lo swap.'
            : undefined,
        summary: isForbidden
          ? 'Il contratto qualifica la licenza come personale e vieta qualsiasi cessione a terzi.'
          : isApproval
            ? "La licenza può essere trasferita a terzi previo consenso dell'emittente e pagamento di commissione."
            : 'La licenza è cedibile liberamente a terzi nel rispetto dell’esaurimento del diritto (UsedSoft).',
        title: isForbidden
          ? 'Divieto di Cessione / Rivendita'
          : isApproval
            ? 'Rivendita con Approvazione & Royalty'
            : 'Cessione Libera (Mercato Secondario)',
      })
    }

    // B. Commercial Use Clause
    const commPara = findParagraph([
      'commercial',
      'commerciale',
      'creative use',
      'scopo di lucro',
      'non-commercial',
    ])
    if (commPara) {
      const isRestricted =
        commPara.toLowerCase().includes('non-commercial') ||
        commPara.toLowerCase().includes('solo uso personale')
      clauses.push({
        category: 'commercial_use',
        id: 'clause-commercial',
        isAmbiguous: false,
        originalQuote:
          commPara.slice(0, 280) + (commPara.length > 280 ? '...' : ''),
        riskLevel: isRestricted ? 'warning' : 'safe',
        riskReason: isRestricted
          ? 'Non idoneo per aziende o liberi professionisti.'
          : undefined,
        summary: isRestricted
          ? 'Il software è riservato a scopi di studio, prova o uso personale privato.'
          : 'La licenza autorizza espressamente l’impiego per produzione commerciale e professionale.',
        title: isRestricted
          ? 'Uso Commerciale Vietato'
          : 'Uso Commerciale Autorizzato',
      })
    }

    // C. DRM & Online Telemetry Clause
    const drmPara = findParagraph([
      'telemetry',
      'heartbeat',
      'validation server',
      'internet access',
      'connessione',
      'verifica',
    ])
    if (drmPara) {
      const isAggressive =
        drmPara.toLowerCase().includes('continuous') ||
        drmPara.toLowerCase().includes('every') ||
        drmPara.toLowerCase().includes('locked immediately')
      clauses.push({
        category: 'drm_telemetry',
        id: 'clause-drm',
        isAmbiguous: false,
        originalQuote:
          drmPara.slice(0, 280) + (drmPara.length > 280 ? '...' : ''),
        riskLevel: isAggressive ? 'warning' : 'safe',
        riskReason: isAggressive
          ? 'Il software non potrà funzionare in ambienti completamente offline o isolati.'
          : undefined,
        summary: isAggressive
          ? 'Richiede connessione internet costante e invia heartbeat periodici con fingerprint hardware.'
          : 'Il software esegue verifiche online periodiche per convalidare lo stato della licenza.',
        title: isAggressive
          ? 'DRM Continuo e Telemetria Hardware'
          : 'Verifica di Integrità Online',
      })
    }

    // D. Revocation & Termination Clause
    const termPara = findParagraph([
      'termination',
      'revoc',
      'risoluzione',
      'invalida',
      'breach',
      'null and void',
    ])
    if (termPara) {
      clauses.push({
        category: 'duration_termination',
        id: 'clause-termination',
        isAmbiguous: false,
        originalQuote:
          termPara.slice(0, 260) + (termPara.length > 260 ? '...' : ''),
        riskLevel: 'safe',
        summary:
          'In caso di violazione dei termini, l’emittente si riserva la revoca immediata delle credenziali.',
        title: 'Condizioni di Risoluzione e Revoca',
      })
    }

    return clauses
  }

  // ── 4. Optional compliance audit ────────────────────────────────────────────
  private static performComplianceAudit(
    detectedPolicy: TransferPolicy,
    claimedPolicy?: TransferPolicy
  ): EulaComplianceAudit {
    if (!claimedPolicy) {
      return {
        aiReviewStatus: 'analyzed',
        detectedTransferPolicy: detectedPolicy,
        matchesClaim: true,
      }
    }

    if (claimedPolicy !== detectedPolicy) {
      let flagReason: string

      if (detectedPolicy === 'not_transferable') {
        flagReason =
          'Critical mismatch: the seller marked the license as transferable, but the EULA contains restrictive clauses that explicitly prohibit sale or transfer to third parties.'
      } else if (
        claimedPolicy === 'transferable_free' &&
        detectedPolicy === 'transferable_with_approval'
      ) {
        flagReason =
          'Incongruenza procedurale: La licenza richiede esplicita autorizzazione scritta e/o pagamento di una transfer fee per la cessione. La politica corretta da impostare è "transferable_with_approval".'
      } else if (
        claimedPolicy === 'not_transferable' &&
        detectedPolicy === 'transferable_with_approval'
      ) {
        flagReason =
          'Compliance mismatch: the seller marked the license as non-transferable, but the contract allows transfer after approval and payment of a transfer fee. The correct policy is "transferable_with_approval".'
      } else {
        flagReason =
          'Compliance mismatch: the seller marked the license as approval-based, but the contract allows free transfer without prior authorization. The correct policy is "transferable_free".'
      }

      return {
        aiReviewStatus: 'flagged',
        claimedTransferPolicy: claimedPolicy,
        detectedTransferPolicy: detectedPolicy,
        flagReason,
        matchesClaim: false,
      }
    }

    return {
      aiReviewStatus: 'analyzed',
      claimedTransferPolicy: claimedPolicy,
      detectedTransferPolicy: detectedPolicy,
      matchesClaim: true,
    }
  }

  // ── 5. Executive Summary ────────────────────────────────────────────────────
  private static generateExecutiveSummary(
    extracted: EulaExtractedMetadata,
    audit: EulaComplianceAudit
  ): string {
    const policyDesc =
      extracted.transferPolicy === 'transferable_free'
        ? 'trasferibile liberamente sul mercato secondario senza preventiva approvazione'
        : extracted.transferPolicy === 'transferable_with_approval'
          ? `rivendibile previa approvazione dell'emittente${extracted.royaltyEstimatePercent ? ` con royalty stimata del ${extracted.royaltyEstimatePercent}%` : ''}`
          : 'strettamente non trasferibile (vincolo esclusivo per il primo acquirente)'

    let summary = `**Sintesi Legale QVAC per ${extracted.productName} (${extracted.edition} v${extracted.version})**\n\n`
    summary += `- **Diritti:** Licenza ${extracted.licenseType === 'perpetual' ? 'perpetua' : 'ad abbonamento'} autorizzata per ${extracted.seatsAllowed} postazione/i su sistemi ${extracted.platforms.join(', ')}.\n`
    summary += `- **Uso Commerciale:** ${extracted.commercialUseAllowed ? 'Consentito per attività professionali.' : 'Non consentito (riservato ad uso personale/educational).'}\n`
    summary += `- **Mercato Secondario LICEX:** La licenza è ${policyDesc}.\n`
    summary += `- **Attivazione & Telemetria:** ${extracted.onlineVerificationRequired ? 'Richiede verifica online periodica (compatibile con revoca e Proof of Holding via Issuer Kit).' : 'Funziona senza telemetria continua.'}`

    if (!audit.matchesClaim && audit.flagReason) {
      summary += `\n\n> ⚠️ **COMPLIANCE REVIEW:** ${audit.flagReason}`
    }

    return summary
  }

  // ── 6. Marketplace Listing Drafting ─────────────────────────────────────────
  private static buildSuggestedListing(
    extracted: EulaExtractedMetadata,
    executiveSummary: string
  ) {
    return {
      durationDays: extracted.durationDays,
      edition: extracted.edition,
      licenseType: extracted.licenseType,
      platforms: extracted.platforms,
      productDescription: executiveSummary,
      productName: extracted.productName,
      royaltyPercent: extracted.royaltyEstimatePercent ?? 5,
      tags: [
        extracted.edition || 'Standard',
        extracted.licenseType,
        ...extracted.platforms,
      ],
      transferPolicy: extracted.transferPolicy,
      version: extracted.version,
    }
  }

  private static calculateConfidence(
    extracted: EulaExtractedMetadata,
    clauses: EulaClause[]
  ): number {
    let score = 70
    if (extracted.productName !== 'Software License') score += 10
    if (clauses.length >= 2) score += 10
    if (clauses.some((c) => c.category === 'transferability')) score += 10
    return Math.min(score, 98)
  }
}

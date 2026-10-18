// ─── QVAC Realistic Sample EULA Contracts ───────────────────────────────────────
// Real-world representative contracts for instant 1-click testing during the hackathon demo.

import type { EulaSample } from './eula-types'

export const EULA_SAMPLES: EulaSample[] = [
  {
    category: 'Audio & Music Production',
    expectedPolicy: 'transferable_with_approval',
    id: 'sample-audio-vst',
    subtitle: 'Licenza perpetua con rivendita soggetta ad approvazione e fee',
    text: `SOUNDMASTER AUDIO TECHNOLOGIES INC.
END USER LICENSE AGREEMENT (EULA) - REVISION 2026.2

1. GRANT OF LICENSE.
SoundMaster grants you a non-exclusive, perpetual license to install and use SoundMaster Pro Edition (Version 4.5) on up to two (2) separate computer systems concurrently, provided that both systems are used exclusively by the registered licensee. The software is provided for both commercial audio production and personal creative use on Windows 10/11 and macOS 13+ systems.

2. LICENSE RESTRICTIONS AND USE.
You may not reverse engineer, decompile, or disassemble the Software. You agree that SoundMaster may periodically connect to our validation servers to verify the digital integrity of the license installation.

3. LICENSE TRANSFER AND RESALE CONDITIONS.
The Licensee may sell, assign, or transfer the Software license to a third party, subject to the following express conditions:
(a) The transferor must submit a formal License Transfer Request to SoundMaster Support and obtain written authorization prior to the finalization of the transaction.
(b) A standard administrative transfer fee of 15% (or equivalent processing royalty) shall be payable to SoundMaster upon registration of the new holder.
(c) Upon completion of the approved transfer, the original Licensee's activation credentials shall be immediately revoked, and all copies must be permanently uninstalled from the transferor's devices.
Any transfer attempted without prior approval shall be deemed null and void and will result in the suspension of the activation key.

4. TERMINATION AND GOVERNING LAW.
This Agreement remains effective until terminated. Failure to comply with any provision hereof shall entitle SoundMaster to revoke your activation without refund.`,
    title: 'SoundMaster Pro VST (Audio Suite)',
  },
  {
    category: 'Engineering & 3D CAD',
    expectedPolicy: 'transferable_free',
    id: 'sample-dev-cad',
    subtitle:
      'Licenza perpetua con libera trasferibilità (UsedSoft / EU Compliant)',
    text: `VOXELWORKS OPEN TECHNOLOGIES EUROPE S.R.L.
CONTRATTO DI LICENZA D'USO SOFTWARE (EULA) - EDIZIONE PROFESSIONALE (V. 12.0)

ARTICOLO 1 - OGGETTO E CONCESSIONE DELLA LICENZA
VoxelWorks concede all'Utente una licenza d'uso perpetua, non esclusiva e mondiale per il software VoxelCAD Studio Professional versione 12.0. La licenza autorizza l'installazione su ambienti operativi Windows, Linux e macOS per uso commerciale, di progettazione industriale e professionale senza limiti di volume di fatturato.

ARTICOLO 2 - POSTAZIONI DI LAVORO
La licenza abilita l'utilizzo del software su un massimo di 1 (una) postazione di lavoro attiva contemporaneamente.

ARTICOLO 3 - TRASFERIBILITÀ DELLA LICENZA E MERCATO SECONDARIO
In piena conformità con la normativa comunitaria e la giurisprudenza della Corte di Giustizia dell'Unione Europea (Sentenza C-128/11, UsedSoft v. Oracle):
1. L'Utente ha il pieno diritto di cedere a titolo oneroso o gratuito la presente licenza a terzi (trasferimento libero).
2. Il trasferimento della titolarità della licenza comporta il contestuale obbligo per il cedente di rendere inutilizzabile e disinstallare ogni copia locale del software presente sui propri sistemi.
3. Il nuovo acquirente acquisisce tutti i diritti d'uso del titolare originario, compreso il diritto all'assistenza e agli aggiornamenti di sicurezza minori per la versione 12.x.
4. Non è richiesta alcuna approvazione preventiva da parte di VoxelWorks; è sufficiente la prova crittografica del passaggio di titolarità dell'asset per richiedere l'attivazione della nuova postazione.

ARTICOLO 4 - GARANZIA ED ESCLUSIONE DI RESPONSABILITÀ
Il software viene fornito nello stato di fatto e di diritto in cui si trova ("AS IS").`,
    title: 'VoxelCAD 3D Studio (Engineering & CAD)',
  },
  {
    category: 'Cloud Services & Design',
    expectedPolicy: 'not_transferable',
    id: 'sample-cloud-saas',
    subtitle:
      'Abbonamento cloud strettamente intrasferibile (Divieto assoluto di cessione)',
    text: `OMNICLOUD SYSTEMS GLOBAL CORP.
TERMS OF SERVICE AND SOFTWARE ACCESS AGREEMENT (SaaS)

SECTION 1. SUBSCRIPTION AND ACCESS.
OmniCloud provides you with a revocable, non-transferable, non-exclusive, monthly subscription access to the OmniCloud Creative Suite Web & Desktop Client. Access is strictly bound to the specific verified named user account credentials.

SECTION 2. STRICT PROHIBITION OF ASSIGNMENT AND RESALE.
YOU MAY NOT RENT, LEASE, LEND, SELL, REDISTRIBUTE, SUBLICENSE, OR TRANSFER THE SOFTWARE OR ANY SUBSCRIPTION SEAT UNDER ANY CIRCUMSTANCES. 
Any attempted sale, assignment, sublicensing, or transfer of this account or license, whether voluntary or involuntary, by operation of law or otherwise, is strictly prohibited and shall immediately terminate this Agreement. Any transfer attempted via secondary market platforms or decentralized tokens shall be considered a material breach of contract and will trigger automated permanent account termination without reimbursement.

SECTION 3. TELEMETRY AND CONTINUOUS VERIFICATION.
The software requires continuous internet access and performs real-time telemetry heartbeats every 60 minutes. If telemetry verification fails or detects logins from unauthorized hardware footprints, execution will be locked immediately.

SECTION 4. NO PERPETUAL PROPERTY RIGHT.
This transaction is an ongoing service subscription, not a sale of software. You do not acquire any property right or transferable asset in the software.`,
    title: 'OmniCloud Creative Enterprise (SaaS Cloud)',
  },
]

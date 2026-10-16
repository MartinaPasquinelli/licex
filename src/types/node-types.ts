/**
 * Node-level types removed from the new SDK.
 *
 * The kaleidoswap-sdk no longer ships types for the RGB Lightning Node (RLN)
 * API.  Until a dedicated node SDK is published, every node-level type is
 * aliased to `any` so the rest of the desktop-app compiles without changes.
 */

// Client
export type RlnClient = any

// Wallet
export type InitRequest = any
export type InitResponse = any
export type UnlockRequest = any
export type BackupRequest = any
export type RestoreRequest = any

// BTC
export type AddressResponse = any
export type BtcBalanceResponse = any
export type SendBtcRequest = any
export type ListTransactionsResponse = any
export type ListUnspentsResponse = any
export type CreateUtxosRequest = any
export type EstimateFeeRequest = any
export type EstimateFeeResponse = any

// RGB Assets
export type AssetBalanceRequest = any
export type AssetBalanceResponse = any
export type IssueAssetNIARequest = any
export type IssueAssetNIAResponse = any
export type ListAssetsResponse = any
export type SendRgbRequest = any
export type SendRgbResponse = any
export type ListTransfersResponse = any
export type RefreshTransfersRequest = any
export type FailTransfersRequest = any

// Lightning Channels
export type ListChannelsResponse = any
export type OpenChannelRequest = any
export type OpenChannelResponse = any
export type CloseChannelRequest = any

// Lightning Peers
export type ListPeersResponse = any
export type ConnectPeerRequest = any
export type ConnectPeerResponse = any
export type DisconnectPeerRequest = any

// Lightning Invoices & Payments
export type CreateLNInvoiceRequest = any
export type CreateLNInvoiceResponse = any
export type CreateRgbInvoiceRequest = any
export type CreateRgbInvoiceResponse = any
export type DecodeLNInvoiceRequest = any
export type DecodeLNInvoiceResponse = any
export type DecodeRgbInvoiceRequest = any
export type DecodeRgbInvoiceResponse = any
export type GetInvoiceStatusRequest = any
export type GetInvoiceStatusResponse = any
export type SendPaymentRequest = any
export type SendPaymentResponse = any
export type KeysendRequest = any
export type KeysendResponse = any
export type ListPaymentsResponse = any

// Swaps
export type ListSwapsResponse = any
export type WhitelistTradeRequest = any
export type MakerInitRequest = any
export type MakerInitResponse = any
export type MakerExecuteRequest = any
export type MakerExecuteResponse = any

// Node info
export type NodeInfoResponse = any

// Signing
export type SignMessageRequest = any
export type SignMessageResponse = any

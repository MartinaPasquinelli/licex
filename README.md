# LICEX — Software Licenses as RGB Assets

LICEX is a hackathon project exploring a marketplace for software
licenses represented as RGB assets on Bitcoin.

The project aims to combine software license discovery and exchange,
AI-assisted license analysis, price monitoring, and demand discovery
for software that does not yet exist.

LICEX is being developed from the existing KaleidoSwap Desktop
codebase. The inherited application is the starting point; the
LICEX-specific features described below are goals, not claims of
completed implementation.

## Vision

LICEX aims to make software licenses easier to discover, evaluate,
monitor, and exchange where their license terms permit transfer.

The platform also explores how aggregated user demand could help
software developers identify unmet needs and propose new products.

## Planned features

- **License marketplace:** browse software licenses, descriptions,
  prices, versions, and applicable transfer conditions.
- **RGB assets:** represent supported transferable licenses as RGB
  assets, subject to a validated protocol integration.
- **QVAC-assisted analysis:** analyse license information, identify
  inconsistencies, compare available evidence, and explain potential
  risks. Analysis alone cannot guarantee that a license is authentic
  or legally transferable.
- **Price watchlist:** monitor listed prices and notify users when
  configured conditions are met.
- **Software wishlist:** record requests for software that is not
  available in the catalogue and identify similar existing solutions.
- **Demand-to-Software:** explore aggregating similar requests and
  suggesting potential developers or companies.
- **Wallet:** investigate WDK integration for supported wallet and
  asset operations.

These features are planned or under investigation unless their
implementation is explicitly documented and tested.

## Technology

The inherited desktop application includes:

- React and TypeScript
- Vite
- Tauri and Rust
- Existing KaleidoSwap-related application components

The intended LICEX architecture explores:

- **RGB Protocol:** representation and transfer of supported digital
  assets using Bitcoin infrastructure.
- **QVAC:** AI-assisted analysis and discovery.
- **WDK:** wallet functionality, subject to the capabilities and
  compatibility of the selected integration.

Listing a technology does not mean its LICEX integration is complete.

## Initial implementation status

This repository contains an existing desktop application that serves
as the starting point for LICEX.

At the initial publication stage, the marketplace, license verification,
price monitoring, software-demand aggregation, and LICEX-specific
RGB/QVAC/WDK integrations must be assessed individually.

The team will document which features are:

- implemented and tested;
- integrated but not fully verified;
- simulated or mocked;
- planned but not implemented.

Inherited code and dependencies must not be presented as new LICEX
work. Existing copyright notices and license requirements must be
preserved.

## Requirements

Install the prerequisites required by the existing Tauri application.
Use a compatible Node.js version, pnpm, and the platform-specific
Tauri/Rust prerequisites.

```bash
brew update
brew install node pnpm rustup llvm ninja cmake openssl@3
rustup-init
```

### 2. Environment Variables & Intel Paths Fix
Add the following exports to your shell profile (`~/.zshrc` or `~/.bash_profile`) [1.12]:
```bash
export PATH="/usr/local/opt/llvm/bin:\$PATH"
export LDFLAGS="-L/usr/local/opt/llvm/lib"
export CPPFLAGS="-I/usr/local/opt/llvm/include"
export CC="/usr/local/opt/llvm/bin/clang"
export CXX="/usr/local/opt/llvm/bin/clang++"
export OPENSSL_DIR="/usr/local/opt/openssl@3"
export OPENSSL_INCLUDE_DIR="/usr/local/opt/openssl@3/include"
export OPENSSL_LIB_DIR="/usr/local/opt/openssl@3/lib"
source \$HOME/.cargo/env
```
Create a symbolic link if needed:
```bash
sudo mkdir -p /opt/homebrew/opt
sudo ln -s /usr/local/opt/openssl@3 /opt/homebrew/opt/openssl@3
```

### 3. Compilation & Execution
```bash
git clone https://github.com
cd licex
pnpm install --frozen-lockfile
pnpm run tauri:dev
```

These commands validate parts of the existing application. They do
not establish that real RGB transfers, license verification, or WDK
wallet operations work.

## Security and license validity

- Never commit credentials, access tokens, private keys, wallet recovery
  phrases, or local `.env` files.
- Use test infrastructure and test funds where possible.
- Treat AI analysis as assistance, not proof of authenticity.
- Allow transfers only where the applicable license terms permit them.
- Do not claim that a payment or RGB transfer succeeded without
  verifying the actual result.
- Clearly identify mocked and simulated functionality.

## Team

- Valentina Giordano
- Enrico Danesi
- Martina Pasquinelli
- Giuseppe Casale

## Hackathon

See [HACKATHON_DEADLINES.md](HACKATHON_DEADLINES.md) for the initial
publication and final commit deadlines.

LICEX is an experimental project under development. Do not rely on
unverified functionality or use real funds in untested flows.

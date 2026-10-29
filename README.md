# LICEX - Software Licenses as RGB Assets

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

Install the prerequisites required by the existing Tauri application:
Node.js, **pnpm 10**, Rust and the platform-specific build tools.

> **Important — pnpm version.** This project declares its `overrides`
> in the `"pnpm"` field of `package.json`, and the lockfile was
> generated accordingly. **pnpm 12 ignores that field**, so
> `pnpm install --frozen-lockfile` fails with
> `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Use **pnpm 10**.
> Do not use `npm install`: it fails with an `ERESOLVE` error
> (`eslint` 9 vs `@eslint/js` 10 peer dependency conflict).
> Do not use `--no-frozen-lockfile`, as it rewrites the lockfile.

### Windows 10/11

WebView2 is already included in Windows 10 (1803+) and Windows 11.
Open a regular **PowerShell** (administrator rights are not needed
except for the Build Tools installer, which asks for elevation itself).

#### 1. Install the prerequisites

```powershell
# Microsoft C++ Build Tools (workload "Desktop development with C++")
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"

# Toolchain and build tools
winget install Rustlang.Rustup
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Kitware.CMake
winget install Ninja-build.Ninja
winget install LLVM.LLVM
winget install ShiningLight.OpenSSL.Dev
```

Close and reopen PowerShell so the `PATH` is refreshed, then:

```powershell
# Tauri on Windows requires the MSVC toolchain
rustup default stable-msvc
```

#### 2. Install pnpm 10

```powershell
npm install -g pnpm@10 --allow-scripts=pnpm
```

Close and reopen PowerShell, then check:

```powershell
pnpm --version   # must print 10.x.x
```

Notes:

- `corepack enable` may fail with `EPERM` because it writes to
  `C:\Program Files\nodejs`. Either run it from an administrator
  PowerShell or use the `npm install -g` command above, which does not
  need administrator rights.
- If `pnpm` is still not recognised, make sure the npm global folder
  (see `npm config get prefix`, usually
  `C:\Users\<you>\AppData\Roaming\npm`) is in your user `Path`.
- Without installing anything you can also run
  `npx pnpm@10 install --frozen-lockfile`.
- Ignore the pnpm banner "Update available 10.x → 12.x": updating
  brings the lockfile error back.

#### 3. Environment variables (only if the build cannot find OpenSSL or LLVM)

Adjust the paths if you installed them elsewhere.

```powershell
setx OPENSSL_DIR "C:\Program Files\OpenSSL-Win64"
setx OPENSSL_INCLUDE_DIR "C:\Program Files\OpenSSL-Win64\include"
setx OPENSSL_LIB_DIR "C:\Program Files\OpenSSL-Win64\lib\VC\x64\MD"
setx LIBCLANG_PATH "C:\Program Files\LLVM\bin"
```

Reopen PowerShell afterwards. To set a variable for the current
session only: `$env:OPENSSL_DIR = "C:\Program Files\OpenSSL-Win64"`.

#### 4. Compilation & execution

```powershell
git clone https://github.com/vvale03/licex.git
cd licex
pnpm install --frozen-lockfile
pnpm run tauri:dev
```

Run the commands from inside the `licex` folder (check with
`Test-Path package.json`). The first Rust build can take several
minutes.

### macOS

#### 1. Install the prerequisites

```bash
brew update
brew install node pnpm rustup llvm ninja cmake openssl@3
rustup-init
```

Make sure pnpm is version 10 (`pnpm --version`). If Homebrew installed
a newer major, use `npm install -g pnpm@10` or `corepack enable` and
`corepack prepare pnpm@10 --activate`.

#### 2. Environment variables (optional)

The project does not force a compiler path in Cargo, so macOS can use its
native Clang and Windows can use MSVC. If Homebrew LLVM/OpenSSL are needed,
use Homebrew's resolved prefixes instead of hardcoding Intel or Apple Silicon
paths. Add the following exports to your shell profile (`~/.zshrc` or
`~/.bash_profile`):

```bash
export PATH="$(brew --prefix llvm)/bin:$PATH"
export LDFLAGS="-L$(brew --prefix openssl@3)/lib"
export CPPFLAGS="-I$(brew --prefix openssl@3)/include"
export CC="$(brew --prefix llvm)/bin/clang"
export CXX="$(brew --prefix llvm)/bin/clang++"
export OPENSSL_DIR="$(brew --prefix openssl@3)"
export OPENSSL_INCLUDE_DIR="$(brew --prefix openssl@3)/include"
export OPENSSL_LIB_DIR="$(brew --prefix openssl@3)/lib"
source "$HOME/.cargo/env"
```

#### 3. Compilation & execution

```bash
git clone https://github.com/vvale03/licex.git
cd licex
pnpm install --frozen-lockfile
pnpm run tauri:dev
```

### Troubleshooting

| Error                                     | Cause                                    | Fix                                                    |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `pnpm` not recognised                     | pnpm not installed or not in `PATH`      | `npm install -g pnpm@10`, reopen the terminal          |
| `EPERM ... pnpx.CMD` on `corepack enable` | No write access to `Program Files`       | Use `npm install -g pnpm@10` or an administrator shell |
| `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`       | pnpm 12 ignores `pnpm.overrides`         | Use pnpm 10                                            |
| `ERESOLVE` on `npm install`               | eslint 9 / `@eslint/js` 10 peer conflict | Use pnpm, not npm                                      |
| `failed to find tool /opt/homebrew/...`   | A macOS compiler path is forced on another OS | Remove global `CC`/`CXX` overrides and use the native compiler |
| Build fails on OpenSSL / libclang         | Missing environment variables            | Set the variables in the Environment Variables step    |

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

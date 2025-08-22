# ReZipang NFT Minting Site

A production-ready NFT minting website built with Next.js 14, Thirdweb SDK v5, and TypeScript.
Easily customizable for different NFT projects through configuration files.

## ✨ Features

- 🔐 **Allowlist Minting** - Only pre-approved addresses can mint
- 💰 **Dynamic Pricing** - Automatic price detection from smart contract  
- 🌍 **Multi-language** - Japanese/English support
- 🧪 **Mint Simulator** - Test before actual minting
- 📊 **Price Checker** - Verify pricing configuration
- 🎨 **ERC1155 Support** - Multiple token ID support
- 📱 **Responsive Design** - Mobile-friendly interface
- ⚙️ **Customizable** - Easy configuration for different projects

## 🚀 Quick Start

```bash
# Clone repository
git clone [repository-url]
cd Rezipang-NFTs-MINT

# Install dependencies (using pnpm)
pnpm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local with your settings

# Run development server
pnpm run dev
```

Visit http://localhost:3000

## 📚 Documentation

Detailed guides are available in the `/docs` folder:

- **[Project Customization Guide](./docs/PROJECT_CUSTOMIZATION_GUIDE.md)** - How to customize for your NFT project
- **[Vercel Deploy Guide](./docs/VERCEL_DEPLOY_GUIDE.md)** - Complete deployment instructions
- **[Complete Setup Guide](./docs/COMPLETE_SETUP_GUIDE.md)** - Full installation and configuration
- **[Price Setup Guide](./docs/PRICE_SETUP.md)** - How to configure NFT pricing
- **[Allowlist Setup](./docs/ALLOWLIST_SETUP.md)** - Managing allowlisted addresses
- **[Multiple NFTs Guide](./docs/MULTIPLE_NFTS.md)** - Supporting multiple collections
- **[Technical Specification](./docs/TECHNICAL_SPEC.md)** - Architecture and implementation details

## 🔧 Configuration

### Project Settings

Edit `project.config.js` to customize:
- NFT names and collection details
- Payment tokens (ZENY, MATIC, ETH)
- UI features and theme
- Language settings

See [Project Customization Guide](./docs/PROJECT_CUSTOMIZATION_GUIDE.md) for details.

### Required Environment Variables

```env
# Thirdweb
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key

# NFT Contract
NEXT_PUBLIC_CONTRACT_ADDRESS=0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
NEXT_PUBLIC_CHAIN_ID=137
NEXT_PUBLIC_DEFAULT_TOKEN_ID=2
```

## 🛠 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Blockchain**: Thirdweb SDK v5
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Package Manager**: pnpm

## 📝 Scripts

```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run start    # Start production server
pnpm run lint     # Run ESLint
```

## 🚢 Deployment

This project is optimized for [Vercel](https://vercel.com) deployment. See [deployment guide](./docs/COMPLETE_SETUP_GUIDE.md#デプロイ) for details.

## 📄 License

[Your License]

## 🤝 Support

For issues or questions:
- Check [documentation](./docs/)
- Open a [GitHub Issue](https://github.com/your-repo/issues)
- Join [Thirdweb Discord](https://discord.gg/thirdweb)

---

Built with ❤️ using [Thirdweb](https://thirdweb.com) and [Next.js](https://nextjs.org)
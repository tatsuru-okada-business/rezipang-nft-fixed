# NFT Minting Site with Thirdweb

## Project Overview
This project is a Next.js-based NFT minting website that integrates with Thirdweb SDK v5. The site implements an allowlist feature, where only pre-approved wallet addresses can mint NFTs.

## Technical Stack
- **Framework**: Next.js 14+ with App Router
- **UI Library**: React 18+
- **Blockchain Integration**: Thirdweb SDK v5
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Language**: TypeScript

## Key Features
1. **Allowlist-based Minting**: Only whitelisted addresses can mint NFTs
2. **Wallet Connection**: Support for multiple wallet providers via Thirdweb ConnectButton
3. **Responsive Design**: Mobile-friendly interface
4. **Environment Configuration**: Secure handling of contract addresses and API keys

## Architecture Decisions

### 1. Thirdweb SDK v5
- Using the latest v5 SDK for better performance (10x faster, 30x lighter bundle)
- Simplified installation with single package
- Native support for 350+ wallets
- Better interoperability with other web3 libraries

### 2. Allowlist Implementation
- **Static Allowlist**: Hardcoded list in environment variables for simplicity
- **Signature-based Minting**: Backend verification for secure minting
- **Frontend Validation**: Pre-check before minting attempt

### 3. Environment Variables
Required environment variables:
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`: Thirdweb client ID from dashboard
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: NFT contract address
- `NEXT_PUBLIC_CHAIN_ID`: Blockchain network ID (e.g., "1" for mainnet, "11155111" for Sepolia)
- `ALLOWLIST_ADDRESSES`: Comma-separated list of allowed wallet addresses
- `THIRDWEB_SECRET_KEY`: Secret key for backend operations (server-side only)

### 4. Project Structure
```
/
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home/minting page
│   └── api/               # API routes
│       └── verify/        # Allowlist verification endpoint
├── components/            # React components
│   ├── MintButton.tsx    # Minting interface component
│   ├── WalletConnect.tsx # Wallet connection component
│   └── AllowlistStatus.tsx # Display allowlist status
├── lib/                   # Utility functions
│   ├── thirdweb.ts       # Thirdweb client configuration
│   └── allowlist.ts      # Allowlist management
├── public/               # Static assets
└── styles/              # Global styles
```

## Development Commands
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production build locally
pnpm start

# Lint code
pnpm lint

# Type check
pnpm type-check
```

## Deployment to Vercel
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

## Security Considerations
1. **Private Keys**: Never expose private keys in frontend code
2. **Allowlist Verification**: Always verify on backend/smart contract
3. **Rate Limiting**: Implement rate limiting for minting endpoints
4. **Input Validation**: Validate all user inputs

## Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for minting flow
- Manual testing on testnet before mainnet deployment

## Future Enhancements
1. Dynamic allowlist management via database
2. Multiple mint phases with different prices
3. NFT reveal mechanism
4. Mint progress tracking
5. Social media integration

## Troubleshooting
Common issues and solutions:
1. **Wallet not connecting**: Check client ID and chain configuration
2. **Minting fails**: Verify contract address and user allowlist status
3. **Transaction errors**: Ensure sufficient gas and correct network

## References
- [Thirdweb Documentation](https://portal.thirdweb.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Thirdweb SDK v5 Migration Guide](https://portal.thirdweb.com/react/v5/migrate)
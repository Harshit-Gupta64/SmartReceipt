# SmartReceipt

An AI-powered business management platform for small teams to run invoices, expenses, inventory, client/vendor records, and cash-flow insights from one dashboard.

## Website Overview

SmartReceipt is designed as a full web experience, not just a dashboard.

- A modern public landing page introduces the product with motion, testimonials, FAQ, and clear calls to action.
- Authentication is handled through Clerk, and the user is guided into a protected app workspace.
- The dashboard presents real-time business data for daily decision-making.

### Main user journey

1. Open the home page and explore features.
2. Enter the app via dashboard CTA.
3. Manage invoices, expenses, inventory, clients, and vendors.
4. Ask the AI assistant business questions using current account data.
5. Trigger automated email notifications when key events occur.

### Website sections at a glance

- Home page: marketing content, social proof, FAQ, onboarding CTA.
- App shell: sidebar navigation + top app bar with user/account controls.
- Dashboard pages: module-based workflow for finance and operations.
- API routes: assistant responses and transactional email handling.

## Why SmartReceipt

SmartReceipt is built for real small-business workflows:

- Create and manage professional invoices
- Track expenses with clear categorization
- Monitor product inventory with low-stock alerts
- Manage clients and vendors in one place
- Ask an AI assistant business questions in plain English
- Trigger transactional emails for invoicing and alerts

## Feature Overview

### Dashboard modules

- Dashboard summary: revenue, expenses, unpaid invoices, low stock, top products
- Invoices: create, edit, track payment status
- Expenses: log and monitor spending
- Inventory: update stock, track reorder levels
- Clients and vendors: maintain business contacts
- AI Assistant: business Q&A over your live data
- Settings: account/app settings panel

### Public marketing page

- Animated landing page with feature highlights, testimonials, and FAQ
- CTA flow into authenticated dashboard

## Tech Stack

- Frontend: Next.js App Router, React 19, TypeScript
- UI: MUI, Tailwind CSS, lucide icons, framer-motion
- Auth: Clerk
- Database: Supabase
- AI: Google Gemini (gemini-2.5-flash)
- Email: Resend

## Project Structure

```text
app/
	page.tsx                    # Public landing page
	layout.tsx                  # Root providers (Clerk + theme)
	api/
		assistant/route.ts        # AI assistant endpoint
		email/route.ts            # Transactional email endpoint
	dashboard/
		page.tsx                  # KPI overview
		invoices/page.tsx
		expenses/page.tsx
		inventory/page.tsx
		clients/page.tsx
		vendors/page.tsx
		assistant/page.tsx
		settings/page.tsx
components/
	app-sidebar.tsx
	session-guard.tsx
lib/
	supabase.ts                 # Browser Supabase client
	supabase-server.ts          # Server Supabase client
	email.ts                    # Resend email helpers
```

## Pages (Brief)

- `/` - Public landing page with product overview, testimonials, and FAQ.
- `/dashboard` - Main business snapshot with key metrics.
- `/dashboard/invoices` - Create, update, and track invoice payments.
- `/dashboard/expenses` - Record and manage business expenses.
- `/dashboard/inventory` - Track stock levels and reorder points.
- `/dashboard/clients` - Manage client records and details.
- `/dashboard/vendors` - Manage vendor records and details.
- `/dashboard/assistant` - Ask AI questions about your business data.
- `/dashboard/settings` - User/app-level settings page.
- `not-found` pages - Friendly fallback screens for missing routes.


## Security Notes

- Routes are protected with Clerk middleware, with a public home route (`/`)
- Session inactivity timeout is enforced (8 hours)
- Server operations use Supabase service role where required

## Deploy

Recommended: Vercel deployment with all environment variables configured in the project settings.

## Contributing

1. Create a feature branch
2. Keep PRs focused and small
3. Run lint/build before opening PR
4. Add clear test or manual verification notes

## License

Private project. All rights reserved.

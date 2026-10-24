import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Terms and Conditions | Pivott', description: 'Terms for using the Pivott career-planning service.' }

export default function TermsPage() {
  return <article className="legal-page mx-auto max-w-3xl px-5 py-12 sm:px-8"><p className="text-sm text-muted-foreground">Last updated 24 October 2026</p><h1>Terms and Conditions</h1><p>These terms apply when you use Pivott. By creating an account or continuing to use the service, you agree to them. If you do not agree, you can stop using the service and remove locally stored data from your browser.</p>
    <h2>What Pivott provides</h2><p>Pivott helps you describe work, compare occupational information, review public job listings and make a learning plan. Scores, scenarios and suggested routes are planning aids. They are estimates based on the information and public sources shown in the product.</p>
    <h2>No employment or professional advice</h2><p>Pivott does not guarantee a job, promotion, salary, training outcome or prediction about automation. It does not act as a recruiter and does not process job applications. Check important career, financial, legal or education decisions with suitable people and the original source.</p>
    <h2>Your account</h2><p>You are responsible for the accuracy of information you enter, the security of your password and activity under your account. Tell the project owner if you believe your account has been misused. You can use the core planning flow without creating an account.</p>
    <h2>Acceptable use</h2><p>Do not use Pivott to break the law, probe or disrupt the service, bypass access controls, submit malware, automate abusive authentication requests, scrape the service in a way that harms availability, or infringe another person’s rights. Access may be limited when needed to protect the service or other users.</p>
    <h2>Public data and links</h2><p>Occupation data and job listings come from the attributed public sources shown in Pivott. Listings can change or expire, and external sites control their own content. Follow each source’s licence and terms when reusing its data.</p>
    <h2>Your content</h2><p>You keep responsibility for the information you enter. You permit Pivott and its infrastructure providers to process that information only as needed to provide the features you request, including optional account sync. Avoid entering confidential employer information or another person’s personal data.</p>
    <h2>Availability and changes</h2><p>The service may change, pause or end, and some features depend on third-party providers. Reasonable care is taken, but uninterrupted or error-free access is not promised. Important updates to these terms will appear on this page with a new date.</p>
    <h2>Liability</h2><p>To the extent permitted by applicable law, Pivott and its contributors are not responsible for indirect losses or decisions made solely from estimates, third-party listings or external links. Nothing in these terms limits rights or liabilities that cannot legally be limited.</p>
    <h2>Questions</h2><p>Open an issue in the <a href="https://github.com/truffleloaf/SDC-Hack/issues" target="_blank" rel="noreferrer">project repository</a> without posting sensitive personal information.</p>
    <p className="mt-10"><Link className="underline" href="/privacy">Read the Privacy Policy</Link></p>
  </article>
}

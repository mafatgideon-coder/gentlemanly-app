export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.01_255)] flex items-center justify-center px-4">
      {children}
    </div>
  )
}

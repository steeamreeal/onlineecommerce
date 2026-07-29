export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="flex items-center gap-2">
        <span className="bg-primary size-6 rounded-md" />
        <span className="font-semibold">Online E-commerce</span>
      </div>
      {children}
    </div>
  );
}

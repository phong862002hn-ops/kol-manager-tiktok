export function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="text-gray-500 mt-1">Sẽ được build ở các phase sau.</p>
    </div>
  );
}

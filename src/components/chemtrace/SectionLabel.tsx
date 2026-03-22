interface SectionLabelProps {
  label: string;
}

export default function SectionLabel({ label }: SectionLabelProps) {
  return (
    <div className="mt-1 mb-3.5">
      <div
        className="font-mono-data uppercase text-[0.66rem] tracking-wider pb-1.5 border-b"
        style={{ color: 'hsl(var(--ct-muted))', borderColor: 'hsl(var(--ct-border))' }}
      >
        {label}
      </div>
    </div>
  );
}

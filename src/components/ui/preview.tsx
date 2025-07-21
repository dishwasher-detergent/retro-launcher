interface NFCCardPreviewProps {
  name: string;
  pathName: string;
  icon?: string;
}

export function Preview({ name, icon, pathName }: NFCCardPreviewProps) {
  return (
    <div className="border rounded-lg p-3 bg-muted">
      <div className="flex items-start gap-3">
        <div className="size-8 bg-primary rounded flex items-center justify-center overflow-hidden">
          {icon ? (
            <img src={icon} alt="Preview" className="size-full" />
          ) : (
            <span className="text-sm">🎮</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{pathName}</p>
        </div>
      </div>
    </div>
  );
}

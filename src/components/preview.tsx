interface PreviewProps {
  name: string;
  pathName: string;
  icon?: string | null;
}

export function Preview({ name, icon }: PreviewProps) {
  return (
    <div className="relative w-72">
      <div className="relative">
        <div className="relative pt-6 bg-gradient-to-br from-slate-200 via-slate-250 to-slate-300 shadow-2xl rounded-xl border border-slate-300/80 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-6 bg-gradient-to-t from-slate-500/60 to-slate-400/40 shadow-inner rounded-tr-lg h-1/2"></div>
          <div className="absolute bottom-0 right-0 w-6 bg-gradient-to-t from-slate-500/60 to-slate-400/40 shadow-inner rounded-tl-lg h-1/2"></div>
          <div className="h-24 relative flex items-center justify-center bg-gradient-to-b from-slate-150 to-slate-250 shadow-inner border-b border-slate-300/50">
            <div className="absolute inset-0 flex flex-col justify-center space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="relative h-1">
                  <div className="absolute left-0 right-0 h-full bg-gradient-to-r from-slate-400 via-slate-350 to-slate-400 shadow-sm border-b border-slate-500/30"></div>
                  <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-full h-16 w-10/12 grid place-items-center shadow-xl border-4 border-slate-200 relative z-10">
              <div className="absolute inset-1 bg-gradient-to-b from-slate-500 to-slate-600 rounded-full shadow-inner"></div>
              <div className="absolute inset-2 bg-gradient-to-t from-transparent via-transparent to-white/10 rounded-full"></div>
              <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"></div>
              <div className="relative flex flex-col items-center justify-center">
                <div className="flex items-center space-x-1.5">
                  <p className="text-slate-200 font-black tracking-[0.1em] drop-shadow-lg text-sm">
                    RETRO LAUNCHER
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="py-3 bg-gradient-to-b from-slate-200 to-slate-300 shadow-inner px-9">
            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg border border-slate-300 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] rounded-lg"></div>
              <div className="absolute inset-0 bg-slate-200/20 rounded-lg transform translate-x-0.5 translate-y-0.5 -z-10"></div>
              <div className="p-4 relative">
                <div className="flex justify-center mb-2">
                  <div className="w-20 h-20 bg-black border-2 border-slate-400 flex items-center justify-center overflow-hidden rounded-md shadow-xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/30 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 pointer-events-none"></div>
                    {icon ? (
                      <img
                        src={icon}
                        alt="Game Icon"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-green-400 text-2xl font-bold drop-shadow-lg filter brightness-110">
                        {name
                          .split(" ")
                          .slice(0, 2)
                          .map((word) => word.charAt(0).toUpperCase())
                          .join("") || "RL"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-black text-lg text-slate-800 uppercase tracking-wide leading-tight drop-shadow-sm">
                    {name}
                  </h3>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 rounded-b-xl bg-gradient-to-b from-slate-350 to-slate-450 shadow-inner border-t border-slate-400/30">
            <div className="flex justify-center">
              <svg
                width="36"
                height="20"
                viewBox="0 0 40 24"
                className="text-slate-600 drop-shadow-md filter"
              >
                <path
                  d="M20 20 L8 8 A2.5 2.5 0 0 1 10.5 6 L29.5 6 A2.5 2.5 0 0 1 32 8 L20 20 Z"
                  fill="currentColor"
                />
                <path
                  d="M20 18 L9 9 A1.5 1.5 0 0 1 10.5 8 L29.5 8 A1.5 1.5 0 0 1 31 9 L20 18 Z"
                  fill="#64748b"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

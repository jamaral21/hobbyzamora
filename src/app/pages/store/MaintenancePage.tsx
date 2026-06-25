import { Link } from 'react-router';
import { Clock3, PackageCheck, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/design-system/Button';

const statusNotes = [
  {
    icon: PackageCheck,
    title: 'Pedidos en curso',
    description: 'Las órdenes recibidas y pendientes continúan su proceso normal.',
  },
  {
    icon: Clock3,
    title: 'Tienda temporalmente cerrada',
    description: 'Home, catálogo, carrito y checkout están deshabilitados mientras dura el mantenimiento.',
  },
  {
    icon: ShieldAlert,
    title: 'Aviso importante',
    description: 'Estamos realizando ajustes en la plataforma para mejorar la experiencia de compra.',
  },
];

export default function MaintenancePage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0b1017] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,1))]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-start px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="grid w-full gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <div className="space-y-6 pt-10 lg:max-w-xl lg:pt-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.28em] text-amber-200 backdrop-blur-sm sm:text-sm sm:tracking-[0.32em]">
              <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.95)]" />
              Sitio en mantenimiento
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.42em] text-slate-400 sm:text-sm">
                Hobby Zamora
              </p>
              <h1 className="max-w-xl text-3xl font-semibold leading-[0.95] tracking-tight text-balance sm:text-4xl lg:text-5xl">
                Sitio en mantenimiento.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Estamos realizando ajustes en la experiencia de compra. Mientras tanto, las órdenes recibidas y pendientes continúan en proceso.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 backdrop-blur-sm">
                La tienda volverá a estar disponible pronto.
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-amber-500/15 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Estado operativo</p>
                  <p className="mt-2 text-xl font-semibold sm:text-2xl">Mantenimiento activo</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/20 sm:h-14 sm:w-14">
                  <ShieldAlert className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
              </div>

              <div className="space-y-3.5">
                {statusNotes.map((note) => {
                  const Icon = note.icon;

                  return (
                    <article
                      key={note.title}
                      className="rounded-2xl border border-white/10 bg-slate-950/35 p-3.5 transition-transform duration-200 hover:-translate-y-0.5 hover:border-amber-400/30 hover:bg-slate-950/55 sm:p-4"
                    >
                      <div className="flex gap-3.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-300/20 sm:h-11 sm:w-11">
                          <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                        </div>
                        <div className="space-y-1">
                          <h2 className="text-sm font-semibold text-white sm:text-base">{note.title}</h2>
                          <p className="text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">{note.description}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
import { useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import type { BankAccount } from '../../data/shipmentsDomain';

export default function ConfiguracionPage() {
  const { config, updateConfig } = useShipmentsData();

  const [metodos, setMetodos] = useState<string[]>([...config.metodosPago]);
  const [cuentas, setCuentas] = useState<BankAccount[]>(
    config.cuentas.map((c) => ({ ...c })),
  );
  const [arrBodegaJP, setArrBodegaJP] = useState(config.arrBodegaJP);
  const [appBeyblade, setAppBeyblade] = useState(config.appBeyblade);
  const [comisionPct, setComisionPct] = useState(config.comisionPct);
  const [saved, setSaved] = useState(false);

  // Ensure we always have 3 bank accounts
  while (cuentas.length < 3) {
    cuentas.push({ titular: '', rut: '', banco: '', tipo: '', numero: '' });
  }

  function handleMetodoChange(idx: number, value: string) {
    setMetodos((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function handleCuentaChange(idx: number, field: keyof BankAccount, value: string) {
    setCuentas((prev) => {
      const next = prev.map((c) => ({ ...c }));
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function handleSave() {
    updateConfig({
      metodosPago: metodos,
      cuentas,
      arrBodegaJP,
      appBeyblade,
      comisionPct,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Configuración</h2>
        <Button size="sm" onClick={handleSave}>
          <Save className="w-4 h-4" /> Guardar
        </Button>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-[#00e676]/90 text-black px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" /> Configuración guardada
        </div>
      )}

      {/* Métodos de Pago */}
      <Card>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Métodos de Pago
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {metodos.map((m, idx) => (
            <Input
              key={idx}
              label={`Slot ${idx}`}
              value={m}
              disabled={idx === 0}
              placeholder={idx === 0 ? 'Efectivo' : `Método ${idx}`}
              onChange={(e) => handleMetodoChange(idx, e.target.value)}
            />
          ))}
        </div>
      </Card>

      {/* Cuentas Bancarias */}
      <Card>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Cuentas Bancarias
        </h3>
        <div className="space-y-6">
          {cuentas.slice(0, 3).map((cuenta, idx) => (
            <div key={idx} className="space-y-3 pb-4 border-b border-border last:border-0 last:pb-0">
              <p className="text-sm font-medium text-foreground">Cuenta {idx + 1}</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Input
                  label="Titular"
                  value={cuenta.titular}
                  onChange={(e) => handleCuentaChange(idx, 'titular', e.target.value)}
                />
                <Input
                  label="RUT"
                  value={cuenta.rut}
                  onChange={(e) => handleCuentaChange(idx, 'rut', e.target.value)}
                />
                <Input
                  label="Banco"
                  value={cuenta.banco}
                  onChange={(e) => handleCuentaChange(idx, 'banco', e.target.value)}
                />
                <Input
                  label="Tipo"
                  value={cuenta.tipo}
                  onChange={(e) => handleCuentaChange(idx, 'tipo', e.target.value)}
                />
                <Input
                  label="Número"
                  value={cuenta.numero}
                  onChange={(e) => handleCuentaChange(idx, 'numero', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Parámetros */}
      <Card>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Parámetros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Arriendo Bodega JP (¥)"
            type="number"
            value={arrBodegaJP}
            onChange={(e) => setArrBodegaJP(Number(e.target.value) || 0)}
          />
          <Input
            label="App Beyblade (¥)"
            type="number"
            value={appBeyblade}
            onChange={(e) => setAppBeyblade(Number(e.target.value) || 0)}
          />
          <Input
            label="Comisión (%)"
            type="number"
            value={comisionPct}
            onChange={(e) => setComisionPct(Number(e.target.value) || 0)}
          />
        </div>
      </Card>
    </div>
  );
}

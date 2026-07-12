import { useEffect, useState } from 'react';
import { Save, CheckCircle, Database, Loader2 } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import type { BankAccount } from '../../data/shipmentsDomain';

export default function ConfiguracionPage() {
  const { config, updateConfig, createBackup } = useShipmentsData();
  const emptyCuenta: BankAccount = { titular: '', rut: '', banco: '', tipo: '', numero: '' };
  const emptyMetodos = Array.from({ length: 10 }, () => '');

  const [metodos, setMetodos] = useState<string[]>([...config.metodosPago]);
  const [cuentas, setCuentas] = useState<BankAccount[]>(
    config.cuentas.map((c) => ({ ...c })),
  );
  const [arrBodegaJP, setArrBodegaJP] = useState(config.arrBodegaJP);
  const [appBeyblade, setAppBeyblade] = useState(config.appBeyblade);
  const [comisionPct, setComisionPct] = useState(config.comisionPct);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const metodosPadded = [
    ...(metodos || []),
    ...Array.from({ length: Math.max(0, 10 - (metodos?.length || 0)) }, () => ''),
  ].slice(0, 10);

  useEffect(() => {
    const incoming = config.metodosPago?.length ? config.metodosPago : emptyMetodos;
    setMetodos([...(incoming || [])]);
    setCuentas((config.cuentas || []).map((c) => ({ ...c })));
    setArrBodegaJP(config.arrBodegaJP);
    setAppBeyblade(config.appBeyblade);
    setComisionPct(config.comisionPct);
  }, [config]);

  const cuentasPadded: BankAccount[] = [
    ...cuentas.map((c) => ({ ...c })),
    ...Array.from({ length: Math.max(0, 3 - cuentas.length) }, () => ({ ...emptyCuenta })),
  ].slice(0, 3);

  function handleMetodoChange(idx: number, value: string) {
    setMetodos((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function handleCuentaChange(idx: number, field: keyof BankAccount, value: string) {
    setCuentas((prev) => {
      const next = [
        ...prev.map((c) => ({ ...c })),
        ...Array.from({ length: Math.max(0, 3 - prev.length) }, () => ({ ...emptyCuenta })),
      ].slice(0, 3);
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    setSaveError(null);
    setIsSaving(true);

    const result = await updateConfig({
      metodosPago: metodosPadded,
      cuentas: cuentasPadded,
      arrBodegaJP,
      appBeyblade,
      comisionPct,
    });

    setIsSaving(false);

    if (!result.ok) {
      setSaveError(result.error || 'No se pudo guardar. Revisa tu sesión e intenta nuevamente.');
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleCreateBackup() {
    setBackupError(null);
    setBackupSuccess(null);
    setIsCreatingBackup(true);

    const result = await createBackup();

    setIsCreatingBackup(false);

    if (!result.ok) {
      setBackupError(result.error || 'No se pudo crear el backup');
      return;
    }

    const sizeMb = (result.data.sizeBytes / (1024 * 1024)).toFixed(2);
    setBackupSuccess(`Backup creado: ${result.data.fileName} (${sizeMb} MB)`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Configuración</h2>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4" /> Guardar
        </Button>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-[#00e676]/90 text-black px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" /> Configuración guardada
        </div>
      )}

      {saveError && (
        <div className="fixed top-4 right-4 z-50 bg-red-600/90 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
          {saveError}
        </div>
      )}

      {backupSuccess && (
        <div className="fixed top-16 right-4 z-50 bg-[#00e676]/90 text-black px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" /> {backupSuccess}
        </div>
      )}

      {backupError && (
        <div className="fixed top-16 right-4 z-50 bg-red-600/90 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
          {backupError}
        </div>
      )}

      {/* Backups */}
      <Card>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Backups
        </h3>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Crea un respaldo manual de la base de datos antes de cambios grandes. Se guarda en el servidor
            y no modifica datos existentes.
          </p>
          <Button type="button" variant="outline" onClick={handleCreateBackup} disabled={isCreatingBackup}>
            {isCreatingBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {isCreatingBackup ? 'Creando backup...' : 'Crear backup ahora'}
          </Button>
        </div>
      </Card>

      {/* Métodos de Pago */}
      <Card>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Métodos de Pago
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {metodosPadded.map((m, idx) => (
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
          {cuentasPadded.map((cuenta, idx) => (
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

import { useState, useRef } from "react";
import { useEmployees, useAddEmployee, useUpdateEmployee, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { useCompanies, useAddCompany, useUpdateCompany, useDeleteCompany, type Company } from "@/hooks/useCompanies";
import { useLocations, useAddLocation, useUpdateLocation, useDeleteLocation, type Location } from "@/hooks/useLocations";
import { useDepartments, useAddDepartment, useUpdateDepartment, useDeleteDepartment, type Department } from "@/hooks/useDepartments";
import { useSectors, useAddSector, useUpdateSector, useDeleteSector, type Sector } from "@/hooks/useSectors";
import { useSubUnits } from "@/hooks/useSubUnits";
import { Plus, Pencil, Trash2, Search, Users, Upload, FileSpreadsheet, X, CheckCircle2, Building2, MapPin, Briefcase, Network, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Can } from "@/components/rbac/Can";
import { usePermissions } from "@/hooks/usePermissions";
import { useScope } from "@/contexts/ScopeContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface EmployeesProps {
  selectedSector: number | null;
}

const EMPLOYMENT_STATUSES = ["Active", "Inactive", "On Leave", "Terminated"];
const DESIGNATIONS = [
  "HR Executive", "HR Manager", "Senior HR Executive", "HR Assistant",
  "Payroll Officer", "Recruitment Specialist", "Training Coordinator",
  "Compliance Officer", "HR Intern",
];

const inputClass = "w-full px-3 py-2 text-sm rounded-md border bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "block text-xs font-medium text-foreground mb-1";

// ─── Company Master Tab ───
function CompanyMasterTab() {
  const { data: companies = [], isLoading } = useCompanies();
  const addCompany = useAddCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [search, setSearch] = useState("");

  const emptyForm = { company_name: "", registration_no: "" as string | null, address: "" as string | null, contact_number: "" as string | null, email: "" as string | null, status: "Active" };
  const [form, setForm] = useState(emptyForm);
  const resetForm = () => setForm(emptyForm);

  const filtered = companies.filter(c =>
    !search || c.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name) { toast({ title: "Error", description: "Company name is required.", variant: "destructive" }); return; }
    try {
      await addCompany.mutateAsync({ ...form, registration_no: form.registration_no || null, address: form.address || null, contact_number: form.contact_number || null, email: form.email || null });
      toast({ title: "Company Added", description: `${form.company_name} added.` });
      resetForm(); setDialogOpen(false);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({ company_name: c.company_name, registration_no: c.registration_no, address: c.address, contact_number: c.contact_number, email: c.email, status: c.status });
    setEditDialogOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await updateCompany.mutateAsync({ id: editing.id, ...form, registration_no: form.registration_no || null, address: form.address || null, contact_number: form.contact_number || null, email: form.email || null });
      toast({ title: "Company Updated" });
      resetForm(); setEditDialogOpen(false); setEditing(null);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDelete = async (c: Company) => {
    try { await deleteCompany.mutateAsync(c.id); toast({ title: "Company Deleted" }); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, label: string) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Company Name *</label><input className={inputClass} value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
        <div><label className={labelClass}>Registration No</label><input className={inputClass} value={form.registration_no || ""} onChange={e => setForm(p => ({ ...p, registration_no: e.target.value }))} /></div>
      </div>
      <div><label className={labelClass}>Address</label><input className={inputClass} value={form.address || ""} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Contact Number</label><input className={inputClass} value={form.contact_number || ""} onChange={e => setForm(p => ({ ...p, contact_number: e.target.value }))} /></div>
        <div><label className={labelClass}>Email</label><input className={inputClass} type="email" value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
      </div>
      <div className="w-1/2">
        <label className={labelClass}>Status</label>
        <select className={inputClass} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
          <option value="Active">Active</option><option value="Inactive">Inactive</option>
        </select>
      </div>
      <div className="flex justify-end pt-2"><Button type="submit" disabled={addCompany.isPending || updateCompany.isPending}>{label}</Button></div>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} compan{filtered.length !== 1 ? "ies" : "y"}</p>
        <Can module="companies" action="create">
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus size={14} /> Add Company</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>{renderForm(handleAdd, "Add Company")}</DialogContent>
          </Dialog>
        </Can>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className={inputClass + " pl-9"} placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {isLoading ? <div className="text-center text-muted-foreground py-8">Loading...</div> : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-20">ID</TableHead><TableHead>Company Name</TableHead><TableHead>Reg No</TableHead><TableHead>Address</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="w-20">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No companies found</TableCell></TableRow> :
                filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-semibold">{c.company_code}</TableCell>
                    <TableCell className="font-semibold">{c.company_name}</TableCell>
                    <TableCell className="text-sm">{c.registration_no || "—"}</TableCell>
                    <TableCell className="text-sm">{c.address || "—"}</TableCell>
                    <TableCell className="text-sm">{c.contact_number || "—"}</TableCell>
                    <TableCell className="text-sm">{c.email || "—"}</TableCell>
                    <TableCell><Badge variant={c.status === "Active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Can module="companies" action="edit">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </Can>
                        <Can module="companies" action="delete">
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Company</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {c.company_name}?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(c)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={editDialogOpen} onOpenChange={o => { setEditDialogOpen(o); if (!o) { resetForm(); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Edit Company</DialogTitle></DialogHeader>{renderForm(handleEdit, "Save Changes")}</DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sector Master Tab ───
function SectorMasterTab() {
  const { data: sectors = [], isLoading } = useSectors();
  const { data: subUnits = [] } = useSubUnits();
  const { data: companies = [] } = useCompanies();
  const addSector = useAddSector();
  const updateSector = useUpdateSector();
  const deleteSector = useDeleteSector();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const parentCompany = companies.find(c => c.company_name === "NextGen Human Capital Solutions");
  const emptyForm = { name: "", sector_type: "Other Sectors", company_id: parentCompany?.id ?? "", status: "Active" };
  const [form, setForm] = useState(emptyForm);
  const resetForm = () => setForm({ ...emptyForm, company_id: parentCompany?.id ?? "" });

  const filtered = sectors.filter(s => {
    if (typeFilter !== "All" && s.sector_type !== typeFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const subUnitBreakdownFor = (sectorId: string, sectorType: string | null) => {
    const list = subUnits.filter(su => su.sector_id === sectorId).map(su => su.sub_unit_name);
    if (list.length === 0) return { short: "—", lines: [] as string[] };
    if (sectorType !== "LEDU") return { short: list.join(", "), lines: list };
    const lines: string[] = [];
    if (list.includes("Lyceum Schools")) lines.push("Lyceum Schools (10 campuses)");
    if (list.includes("Early Childhood")) lines.push("Early Childhood → Lyceum Leaf School, Lyceum Daycare");
    if (list.includes("Higher Education")) lines.push("Higher Education → Lyceum Placements, Placements - LIS, Lyceum Campus, Lyceum Assessments, Lyceum Education, JBD, The Lyceum Academy");
    return { short: list.join(", "), lines };
  };

  const getCompanyName = (id: string | null) => companies.find(c => c.id === id)?.company_name || "—";

  const openAdd = () => { setEditing(null); resetForm(); setDialogOpen(true); };
  const openEdit = (s: Sector) => {
    setEditing(s);
    setForm({ name: s.name, sector_type: s.sector_type ?? "Other Sectors", company_id: s.company_id ?? "", status: s.status });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Error", description: "Sector name required.", variant: "destructive" }); return; }
    try {
      if (editing) {
        await updateSector.mutateAsync({ id: editing.id, name: form.name, sector_type: form.sector_type, company_id: form.company_id || null, status: form.status });
        toast({ title: "Sector Updated" });
      } else {
        await addSector.mutateAsync({ name: form.name, sector_type: form.sector_type, company_id: form.company_id || null, status: form.status });
        toast({ title: "Sector Added" });
      }
      resetForm(); setDialogOpen(false); setEditing(null);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDelete = async (s: Sector) => {
    try { await deleteSector.mutateAsync(s.id); toast({ title: "Sector Deleted" }); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} sector{filtered.length !== 1 ? "s" : ""}</p>
        <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus size={14} /> Add Sector</Button>
      </div>
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className={inputClass + " pl-9"} placeholder="Search sectors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={inputClass + " w-auto"} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="All">All Types</option>
          <option value="LEDU">LEDU</option>
          <option value="Other Sectors">Other Sectors</option>
        </select>
      </div>
      {isLoading ? <div className="text-center text-muted-foreground py-8">Loading...</div> : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-24">Sector ID</TableHead>
              <TableHead>Sector Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sub-units</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sectors found</TableCell></TableRow> :
                filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-semibold">{s.sector_code || "—"}</TableCell>
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        {s.sector_type === "LEDU" && <GraduationCap className="h-3.5 w-3.5 text-primary" />}
                        {s.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.sector_type === "LEDU" ? "default" : "secondary"}>{s.sector_type || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      {(() => {
                        const b = subUnitBreakdownFor(s.id, s.sector_type);
                        return (
                          <div className="truncate cursor-help" title={b.lines.join("\n")}>{b.short}</div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">{getCompanyName(s.company_id)}</TableCell>
                    <TableCell><Badge variant={s.status === "Active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.created_at?.slice(0, 10)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Sector</AlertDialogTitle>
                              <AlertDialogDescription>Delete {s.name}? This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(s)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { resetForm(); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Sector" : "Add Sector"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div><label className={labelClass}>Sector Name *</label>
              <input className={inputClass} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Sector Type *</label>
                <select className={inputClass} value={form.sector_type} onChange={e => setForm(p => ({ ...p, sector_type: e.target.value }))}>
                  <option value="LEDU">LEDU</option>
                  <option value="Other Sectors">Other Sectors</option>
                </select>
              </div>
              <div><label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="Active">Active</option><option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div><label className={labelClass}>Parent Company</label>
              <select className={inputClass} value={form.company_id || ""} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
                <option value="">— None —</option>
                {companies.filter(c => c.status === "Active").map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="flex justify-end pt-2"><Button type="submit" disabled={addSector.isPending || updateSector.isPending}>{editing ? "Save Changes" : "Add Sector"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Location Master Tab ───
function LocationMasterTab() {
  const { data: locations = [], isLoading } = useLocations();
  const { data: companies = [] } = useCompanies();
  const { data: sectors = [] } = useSectors();
  const { data: subUnits = [] } = useSubUnits();
  const addLocation = useAddLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [search, setSearch] = useState("");

  const emptyForm = { location_name: "", address: "" as string | null, city: "" as string | null, country: "Sri Lanka" as string | null, status: "Active", company_id: "" as string | null, sector_id: "" as string | null, sub_unit_id: "" as string | null };
  const [form, setForm] = useState(emptyForm);
  const resetForm = () => setForm(emptyForm);

  const filtered = locations.filter(l => !search || l.location_name.toLowerCase().includes(search.toLowerCase()));

  const availableSubUnits = subUnits.filter(su => !form.sector_id || su.sector_id === form.sector_id);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location_name) { toast({ title: "Error", description: "Location name is required.", variant: "destructive" }); return; }
    try {
      await addLocation.mutateAsync({ ...form, address: form.address || null, city: form.city || null, country: form.country || null, company_id: form.company_id || null, sector_id: form.sector_id || null, sub_unit_id: form.sub_unit_id || null });
      toast({ title: "Location Added", description: `${form.location_name} added.` });
      resetForm(); setDialogOpen(false);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const openEdit = (l: Location) => {
    setEditing(l);
    setForm({ location_name: l.location_name, address: l.address, city: l.city, country: l.country, status: l.status, company_id: l.company_id, sector_id: l.sector_id, sub_unit_id: l.sub_unit_id });
    setEditDialogOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await updateLocation.mutateAsync({ id: editing.id, ...form, address: form.address || null, city: form.city || null, country: form.country || null, company_id: form.company_id || null, sector_id: form.sector_id || null, sub_unit_id: form.sub_unit_id || null });
      toast({ title: "Location Updated" });
      resetForm(); setEditDialogOpen(false); setEditing(null);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDelete = async (l: Location) => {
    try { await deleteLocation.mutateAsync(l.id); toast({ title: "Location Deleted" }); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const getCompanyName = (id: string | null) => companies.find(c => c.id === id)?.company_name || "—";
  const getSectorName = (id: string | null) => sectors.find(s => s.id === id)?.name || "—";
  const getSubUnitName = (id: string | null) => subUnits.find(s => s.id === id)?.sub_unit_name || "—";

  const renderForm = (onSubmit: (e: React.FormEvent) => void, label: string) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Location Name *</label><input className={inputClass} value={form.location_name} onChange={e => setForm(p => ({ ...p, location_name: e.target.value }))} /></div>
        <div><label className={labelClass}>City</label><input className={inputClass} value={form.city || ""} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
      </div>
      <div><label className={labelClass}>Address</label><input className={inputClass} value={form.address || ""} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Sector</label>
          <select className={inputClass} value={form.sector_id || ""} onChange={e => setForm(p => ({ ...p, sector_id: e.target.value || null, sub_unit_id: null }))}>
            <option value="">— None —</option>
            {sectors.filter(s => s.status === "Active").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Sub-unit</label>
          <select className={inputClass} value={form.sub_unit_id || ""} onChange={e => setForm(p => ({ ...p, sub_unit_id: e.target.value || null }))} disabled={availableSubUnits.length === 0}>
            <option value="">— None —</option>
            {availableSubUnits.map(su => <option key={su.id} value={su.id}>{su.sub_unit_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Country</label><input className={inputClass} value={form.country || ""} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
        <div>
          <label className={labelClass}>Linked Company</label>
          <select className={inputClass} value={form.company_id || ""} onChange={e => setForm(p => ({ ...p, company_id: e.target.value || null }))}>
            <option value="">— None —</option>
            {companies.filter(c => c.status === "Active").map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
      </div>
      <div className="w-1/2">
        <label className={labelClass}>Status</label>
        <select className={inputClass} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
          <option value="Active">Active</option><option value="Inactive">Inactive</option>
        </select>
      </div>
      <div className="flex justify-end pt-2"><Button type="submit" disabled={addLocation.isPending || updateLocation.isPending}>{label}</Button></div>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} location{filtered.length !== 1 ? "s" : ""}</p>
        <Can module="locations" action="create">
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus size={14} /> Add Location</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>{renderForm(handleAdd, "Add Location")}</DialogContent>
          </Dialog>
        </Can>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className={inputClass + " pl-9"} placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {isLoading ? <div className="text-center text-muted-foreground py-8">Loading...</div> : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Location Name</TableHead>
              <TableHead>Sub-unit</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Linked Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No locations found</TableCell></TableRow> :
                filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs font-semibold">{l.location_code}</TableCell>
                    <TableCell className="font-semibold">{l.location_name}</TableCell>
                    <TableCell className="text-sm">{getSubUnitName(l.sub_unit_id)}</TableCell>
                    <TableCell className="text-sm">{getSectorName(l.sector_id)}</TableCell>
                    <TableCell className="text-sm">{l.city || "—"}</TableCell>
                    <TableCell className="text-sm">{getCompanyName(l.company_id)}</TableCell>
                    <TableCell><Badge variant={l.status === "Active" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Can module="locations" action="edit">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </Can>
                        <Can module="locations" action="delete">
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Location</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {l.location_name}?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(l)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={editDialogOpen} onOpenChange={o => { setEditDialogOpen(o); if (!o) { resetForm(); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Edit Location</DialogTitle></DialogHeader>{renderForm(handleEdit, "Save Changes")}</DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Employee Master Tab ───
function EmployeeMasterTab() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: locations = [] } = useLocations();
  const { data: departments = [] } = useDepartments();
  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [bulkData, setBulkData] = useState<typeof emptyForm[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCompanies = companies.filter(c => c.status === "Active");
  const activeLocations = locations.filter(l => l.status === "Active");
  const activeDepartments = departments.filter(d => d.status === "Active");

  const emptyForm = {
    employee_name: "",
    company_name: activeCompanies[0]?.company_name || "",
    location: "" as string | null,
    designation: "" as string | null,
    department: "" as string | null,
    reporting_manager: "" as string | null,
    employment_status: "Active",
    date_joined: "" as string | null,
    email: "" as string | null,
  };

  const [form, setForm] = useState(emptyForm);
  const resetForm = () => { setForm({ ...emptyForm, company_name: activeCompanies[0]?.company_name || "" }); setBulkData([]); setBulkFileName(""); setAddMode("single"); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
      const parsed = rows.map(row => ({
        employee_name: String(row["Employee Name"] || row["employee_name"] || "").trim(),
        company_name: String(row["Company Name"] || row["company_name"] || activeCompanies[0]?.company_name || "").trim(),
        location: String(row["Location"] || row["location"] || "").trim() || null,
        designation: String(row["Designation"] || row["designation"] || "").trim() || null,
        department: String(row["Department"] || row["department"] || "").trim() || null,
        reporting_manager: String(row["Reporting Manager"] || row["reporting_manager"] || "").trim() || null,
        employment_status: String(row["Employment Status"] || row["employment_status"] || "Active").trim(),
        date_joined: row["Date Joined"] || row["date_joined"] ? String(row["Date Joined"] || row["date_joined"]).trim() : null,
        email: String(row["Email"] || row["email"] || "").trim() || null,
      })).filter(r => r.employee_name);
      setBulkData(parsed);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBulkAdd = async () => {
    if (bulkData.length === 0) return;
    setIsBulkAdding(true);
    let success = 0, failed = 0;
    for (const emp of bulkData) {
      try { await addEmployee.mutateAsync(emp); success++; } catch { failed++; }
    }
    toast({ title: "Bulk Import Complete", description: `${success} added, ${failed} failed.` });
    setBulkData([]); setBulkFileName(""); setAddMode("single"); setDialogOpen(false); setIsBulkAdding(false);
  };

  const removeBulkRow = (index: number) => setBulkData(prev => prev.filter((_, i) => i !== index));

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Employee Name", "Company Name", "Location", "Designation", "Reporting Manager", "Employment Status", "Date Joined", "Email"],
      ["John Doe", "NextGen Human Capital Solutions", "Colombo", "HR Executive", "", "Active", "2026-01-15", "john@example.com"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_template.xlsx");
  };

  const { canAccessByName } = usePermissions();
  const scopeLookups = {
    companies: new Map(companies.map(c => [c.company_name.trim().toLowerCase(), c.id])),
    departments: new Map(departments.map(d => [d.department_name.trim().toLowerCase(), d.id])),
    locations: new Map(locations.map(l => [l.location_name.trim().toLowerCase(), l.id])),
  };

  const { companyId: scopeCompanyId, departmentId: scopeDepartmentId } = useScope();
  const scopeCompany = companies.find(c => c.id === scopeCompanyId);
  const scopeDepartment = departments.find(d => d.id === scopeDepartmentId);

  const filtered = employees.filter(e => {
    if (statusFilter !== "All" && e.employment_status !== statusFilter) return false;
    if (search && !e.employee_name.toLowerCase().includes(search.toLowerCase()) && !e.employee_id.includes(search)) return false;
    if (!canAccessByName(e.company_name, e.department, e.location, scopeLookups, e.id)) return false;
    if (scopeCompany && e.company_name !== scopeCompany.company_name) return false;
    if (scopeDepartment && e.department !== scopeDepartment.department_name) return false;
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_name) { toast({ title: "Validation Error", description: "Employee name is required.", variant: "destructive" }); return; }
    try {
      await addEmployee.mutateAsync({ ...form, location: form.location || null, designation: form.designation || null, department: form.department || null, reporting_manager: form.reporting_manager || null, date_joined: form.date_joined || null, email: form.email || null });
      toast({ title: "Employee Added", description: `${form.employee_name} has been added.` });
      resetForm(); setDialogOpen(false);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({ employee_name: emp.employee_name, company_name: emp.company_name, location: emp.location, designation: emp.designation, department: emp.department, reporting_manager: emp.reporting_manager, employment_status: emp.employment_status, date_joined: emp.date_joined, email: emp.email });
    setEditDialogOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      await updateEmployee.mutateAsync({ id: editingEmployee.id, ...form, location: form.location || null, designation: form.designation || null, department: form.department || null, reporting_manager: form.reporting_manager || null, date_joined: form.date_joined || null, email: form.email || null });
      toast({ title: "Employee Updated", description: `${form.employee_name} has been updated.` });
      resetForm(); setEditDialogOpen(false); setEditingEmployee(null);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDelete = async (emp: Employee) => {
    try { await deleteEmployee.mutateAsync(emp.id); toast({ title: "Employee Deleted", description: `${emp.employee_name} has been removed.` }); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Employee Name *</label><input className={inputClass} placeholder="Full name" value={form.employee_name} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} /></div>
        <div>
          <label className={labelClass}>Company Name</label>
          <select className={inputClass} value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}>
            {activeCompanies.map(c => <option key={c.id} value={c.company_name}>{c.company_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Location</label>
          <select className={inputClass} value={form.location || ""} onChange={e => setForm(p => ({ ...p, location: e.target.value || null }))}>
            <option value="">Select location</option>
            {activeLocations.map(l => <option key={l.id} value={l.location_name}>{l.location_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Designation</label>
          <select className={inputClass} value={form.designation || ""} onChange={e => setForm(p => ({ ...p, designation: e.target.value || null }))}>
            <option value="">Select designation</option>
            {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Department</label>
          <select className={inputClass} value={form.department || ""} onChange={e => setForm(p => ({ ...p, department: e.target.value || null }))}>
            <option value="">Select department</option>
            {activeDepartments.map(d => <option key={d.id} value={d.department_name}>{d.department_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Reporting Manager</label>
          <select className={inputClass} value={form.reporting_manager || ""} onChange={e => setForm(p => ({ ...p, reporting_manager: e.target.value || null }))}>
            <option value="">Select manager</option>
            {employees.filter(emp => emp.employee_name !== form.employee_name).map(emp => <option key={emp.id} value={emp.employee_name}>{emp.employee_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Employment Status</label>
          <select className={inputClass} value={form.employment_status} onChange={e => setForm(p => ({ ...p, employment_status: e.target.value }))}>
            {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Email</label><input type="email" className={inputClass} placeholder="employee@example.com" value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value || null }))} /></div>
        <div><label className={labelClass}>Date Joined</label><input type="date" className={inputClass} value={form.date_joined || ""} onChange={e => setForm(p => ({ ...p, date_joined: e.target.value || null }))} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2"><Button type="submit" disabled={addEmployee.isPending || updateEmployee.isPending}>{submitLabel}</Button></div>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</p>
        <Can module="employees" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus size={14} /> Add Employee</Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
              <div className="flex gap-2 mt-1">
                <Button variant={addMode === "single" ? "default" : "outline"} size="sm" onClick={() => setAddMode("single")} className="gap-1.5"><Plus size={14} /> Single Entry</Button>
                <Can module="employees" action="upload">
                  <Button variant={addMode === "bulk" ? "default" : "outline"} size="sm" onClick={() => setAddMode("bulk")} className="gap-1.5"><FileSpreadsheet size={14} /> Bulk Upload</Button>
                </Can>
              </div>
              {addMode === "single" ? renderForm(handleAdd, "Add Employee") : (
                <div className="space-y-4 mt-2">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3 bg-muted/30">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div><p className="text-sm font-medium text-foreground">Upload Excel File (.xlsx, .xls, .csv)</p><p className="text-xs text-muted-foreground mt-1">File should have columns: Employee Name, Company Name, Location, Designation, etc.</p></div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5"><Upload size={14} /> Choose File</Button>
                      <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1.5"><FileSpreadsheet size={14} /> Download Template</Button>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                    {bulkFileName && <p className="text-xs text-primary font-medium">📎 {bulkFileName}</p>}
                  </div>
                  {bulkData.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Preview — {bulkData.length} employee{bulkData.length !== 1 ? "s" : ""}</p>
                        <Button variant="ghost" size="sm" onClick={() => { setBulkData([]); setBulkFileName(""); }}><X size={14} className="mr-1" /> Clear</Button>
                      </div>
                      <div className="max-h-60 overflow-auto border rounded-md">
                        <Table>
                          <TableHeader><TableRow><TableHead className="w-8">#</TableHead><TableHead>Name</TableHead><TableHead>Company</TableHead><TableHead>Location</TableHead><TableHead>Designation</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                          <TableBody>
                            {bulkData.map((row, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                                <TableCell className="text-sm font-medium">{row.employee_name}</TableCell>
                                <TableCell className="text-xs">{row.company_name}</TableCell>
                                <TableCell className="text-xs">{row.location || "—"}</TableCell>
                                <TableCell className="text-xs">{row.designation || "—"}</TableCell>
                                <TableCell><Badge variant={row.employment_status === "Active" ? "default" : "secondary"} className="text-[10px]">{row.employment_status}</Badge></TableCell>
                                <TableCell><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeBulkRow(i)}><X size={12} /></Button></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex justify-end pt-2"><Button onClick={handleBulkAdd} disabled={isBulkAdding} className="gap-1.5">{isBulkAdding ? "Adding..." : `Add ${bulkData.length} Employees`}</Button></div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </Can>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className={inputClass + " pl-9"} placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={inputClass + " w-auto"} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-center text-muted-foreground py-8">Loading employees...</div> : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-20">Emp ID</TableHead><TableHead>Employee Name</TableHead><TableHead>Company Name</TableHead><TableHead>Location</TableHead><TableHead>Department</TableHead><TableHead>Designation</TableHead><TableHead>Email</TableHead><TableHead>Reporting Manager</TableHead><TableHead>Status</TableHead><TableHead>Date Joined</TableHead><TableHead className="w-20">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow> :
                filtered.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs font-semibold">{emp.employee_id}</TableCell>
                    <TableCell className="font-semibold">{emp.employee_name}</TableCell>
                    <TableCell className="text-sm">{emp.company_name}</TableCell>
                    <TableCell className="text-sm">{emp.location || "—"}</TableCell>
                    <TableCell className="text-sm">{emp.department || "—"}</TableCell>
                    <TableCell className="text-sm">{emp.designation || "—"}</TableCell>
                    <TableCell className="text-sm">{emp.email || "—"}</TableCell>
                    <TableCell className="text-sm">{emp.reporting_manager || "—"}</TableCell>
                    <TableCell><Badge variant={emp.employment_status === "Active" ? "default" : "secondary"}>{emp.employment_status}</Badge></TableCell>
                    <TableCell className="text-sm">{emp.date_joined || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Can module="employees" action="edit">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </Can>
                        <Can module="employees" action="delete">
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Employee</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {emp.employee_name}?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(emp)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={open => { setEditDialogOpen(open); if (!open) { resetForm(); setEditingEmployee(null); } }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee — {editingEmployee?.employee_id}</DialogTitle></DialogHeader>
          {renderForm(handleEdit, "Save Changes")}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Department Master Tab ───
function DepartmentMasterTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: companies = [] } = useCompanies();
  const addDepartment = useAddDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [search, setSearch] = useState("");

  const emptyForm = { department_name: "", company_id: "" as string | null, sector_type: "Other Sectors", status: "Active" };
  const [form, setForm] = useState(emptyForm);
  const resetForm = () => setForm(emptyForm);
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const filtered = departments.filter(d => {
    if (typeFilter !== "All" && d.sector_type !== typeFilter) return false;
    if (search && !d.department_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department_name) { toast({ title: "Error", description: "Department name is required.", variant: "destructive" }); return; }
    try {
      await addDepartment.mutateAsync({ department_name: form.department_name, company_id: form.company_id || null, sector_type: form.sector_type, status: form.status });
      toast({ title: "Department Added", description: `${form.department_name} added.` });
      resetForm(); setDialogOpen(false);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ department_name: d.department_name, company_id: d.company_id, sector_type: d.sector_type ?? "Other Sectors", status: d.status });
    setEditDialogOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await updateDepartment.mutateAsync({ id: editing.id, department_name: form.department_name, company_id: form.company_id || null, sector_type: form.sector_type, status: form.status });
      toast({ title: "Department Updated" });
      resetForm(); setEditDialogOpen(false); setEditing(null);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDelete = async (d: Department) => {
    try { await deleteDepartment.mutateAsync(d.id); toast({ title: "Department Deleted" }); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const getCompanyName = (id: string | null) => companies.find(c => c.id === id)?.company_name || "—";

  const renderForm = (onSubmit: (e: React.FormEvent) => void, label: string) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-2">
      <div><label className={labelClass}>Department Name *</label><input className={inputClass} value={form.department_name} onChange={e => setForm(p => ({ ...p, department_name: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Sector Type *</label>
          <select className={inputClass} value={form.sector_type} onChange={e => setForm(p => ({ ...p, sector_type: e.target.value }))}>
            <option value="LEDU">LEDU</option>
            <option value="Other Sectors">Other Sectors</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Linked Company</label>
          <select className={inputClass} value={form.company_id || ""} onChange={e => setForm(p => ({ ...p, company_id: e.target.value || null }))}>
            <option value="">— None —</option>
            {companies.filter(c => c.status === "Active").map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
      </div>
      {form.sector_type === "LEDU" && form.department_name === "HR Systems & Compliance" && (
        <p className="text-xs text-destructive">"HR Systems & Compliance" cannot be assigned to LEDU.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="Active">Active</option><option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end pt-2"><Button type="submit" disabled={addDepartment.isPending || updateDepartment.isPending}>{label}</Button></div>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} department{filtered.length !== 1 ? "s" : ""}</p>
        <Can module="departments" action="create">
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus size={14} /> Add Department</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>{renderForm(handleAdd, "Add Department")}</DialogContent>
          </Dialog>
        </Can>
      </div>
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className={inputClass + " pl-9"} placeholder="Search departments..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={inputClass + " w-auto"} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="All">All Sector Types</option>
          <option value="LEDU">LEDU</option>
          <option value="Other Sectors">Other Sectors</option>
        </select>
      </div>
      {isLoading ? <div className="text-center text-muted-foreground py-8">Loading...</div> : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-20">ID</TableHead><TableHead>Department Name</TableHead><TableHead>Sector Type</TableHead><TableHead>Linked Company</TableHead><TableHead>Status</TableHead><TableHead className="w-20">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No departments found</TableCell></TableRow> :
                filtered.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs font-semibold">{d.department_code}</TableCell>
                    <TableCell className="font-semibold">{d.department_name}</TableCell>
                    <TableCell><Badge variant={d.sector_type === "LEDU" ? "default" : "secondary"}>{d.sector_type || "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{getCompanyName(d.company_id)}</TableCell>
                    <TableCell><Badge variant={d.status === "Active" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Can module="departments" action="edit">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </Can>
                        <Can module="departments" action="delete">
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Department</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {d.department_name}?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(d)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={editDialogOpen} onOpenChange={o => { setEditDialogOpen(o); if (!o) { resetForm(); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>{renderForm(handleEdit, "Save Changes")}</DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Employees Page ───
export default function Employees({ selectedSector }: EmployeesProps) {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" /> Employees Module
      </h1>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="employees" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Employee Master</TabsTrigger>
          <TabsTrigger value="sectors" className="gap-1.5 text-xs"><Network className="h-3.5 w-3.5" /> Sector Master</TabsTrigger>
          <TabsTrigger value="companies" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Company Master</TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" /> Location Master</TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5 text-xs"><Briefcase className="h-3.5 w-3.5" /> Department Master</TabsTrigger>
        </TabsList>

        <TabsContent value="employees"><EmployeeMasterTab /></TabsContent>
        <TabsContent value="sectors"><SectorMasterTab /></TabsContent>
        <TabsContent value="companies"><CompanyMasterTab /></TabsContent>
        <TabsContent value="locations"><LocationMasterTab /></TabsContent>
        <TabsContent value="departments"><DepartmentMasterTab /></TabsContent>
      </Tabs>
    </div>
  );
}

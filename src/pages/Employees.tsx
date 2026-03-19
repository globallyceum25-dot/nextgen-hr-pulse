import { useState, useRef } from "react";
import { useEmployees, useAddEmployee, useUpdateEmployee, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { LOCATIONS, COMPANY_NAMES } from "@/data/mockData";
import { Plus, Pencil, Trash2, Search, Users, Upload, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const emptyForm = {
  employee_name: "",
  company_name: COMPANY_NAMES[0],
  location: "" as string | null,
  designation: "" as string | null,
  reporting_manager: "" as string | null,
  employment_status: "Active",
  date_joined: "" as string | null,
};

export default function Employees({ selectedSector }: EmployeesProps) {
  const { data: employees = [], isLoading } = useEmployees();
  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [bulkData, setBulkData] = useState<typeof emptyForm[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => { setForm(emptyForm); setBulkData([]); setBulkFileName(""); setAddMode("single"); };

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
        company_name: String(row["Company Name"] || row["company_name"] || COMPANY_NAMES[0]).trim(),
        location: String(row["Location"] || row["location"] || "").trim() || null,
        designation: String(row["Designation"] || row["designation"] || "").trim() || null,
        reporting_manager: String(row["Reporting Manager"] || row["reporting_manager"] || "").trim() || null,
        employment_status: String(row["Employment Status"] || row["employment_status"] || "Active").trim(),
        date_joined: row["Date Joined"] || row["date_joined"] ? String(row["Date Joined"] || row["date_joined"]).trim() : null,
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
      try {
        await addEmployee.mutateAsync({
          employee_name: emp.employee_name,
          company_name: emp.company_name,
          location: emp.location,
          designation: emp.designation,
          reporting_manager: emp.reporting_manager,
          employment_status: emp.employment_status,
          date_joined: emp.date_joined,
        });
        success++;
      } catch { failed++; }
    }
    toast({ title: "Bulk Import Complete", description: `${success} added, ${failed} failed.` });
    setBulkData([]);
    setBulkFileName("");
    setAddMode("single");
    setDialogOpen(false);
    setIsBulkAdding(false);
  };

  const removeBulkRow = (index: number) => setBulkData(prev => prev.filter((_, i) => i !== index));

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Employee Name", "Company Name", "Location", "Designation", "Reporting Manager", "Employment Status", "Date Joined"],
      ["John Doe", "NextGen Human Capital Solutions", "Colombo", "HR Executive", "", "Active", "2026-01-15"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_template.xlsx");
  };

  const filtered = employees.filter(e => {
    if (statusFilter !== "All" && e.employment_status !== statusFilter) return false;
    if (search && !e.employee_name.toLowerCase().includes(search.toLowerCase()) &&
        !e.employee_id.includes(search)) return false;
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_name) {
      toast({ title: "Validation Error", description: "Employee name is required.", variant: "destructive" });
      return;
    }
    try {
      await addEmployee.mutateAsync({
        employee_name: form.employee_name,
        company_name: form.company_name,
        location: form.location || null,
        designation: form.designation || null,
        reporting_manager: form.reporting_manager || null,
        employment_status: form.employment_status,
        date_joined: form.date_joined || null,
      });
      toast({ title: "Employee Added", description: `${form.employee_name} has been added.` });
      resetForm();
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      employee_name: emp.employee_name,
      company_name: emp.company_name,
      location: emp.location,
      designation: emp.designation,
      reporting_manager: emp.reporting_manager,
      employment_status: emp.employment_status,
      date_joined: emp.date_joined,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      await updateEmployee.mutateAsync({
        id: editingEmployee.id,
        employee_name: form.employee_name,
        company_name: form.company_name,
        location: form.location || null,
        designation: form.designation || null,
        reporting_manager: form.reporting_manager || null,
        employment_status: form.employment_status,
        date_joined: form.date_joined || null,
      });
      toast({ title: "Employee Updated", description: `${form.employee_name} has been updated.` });
      resetForm();
      setEditDialogOpen(false);
      setEditingEmployee(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (emp: Employee) => {
    try {
      await deleteEmployee.mutateAsync(emp.id);
      toast({ title: "Employee Deleted", description: `${emp.employee_name} has been removed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-md border bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-foreground mb-1";

  const renderForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Employee Name *</label>
          <input className={inputClass} placeholder="Full name" value={form.employee_name}
            onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>Company Name</label>
          <select className={inputClass} value={form.company_name}
            onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}>
            {COMPANY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Location</label>
          <select className={inputClass} value={form.location || ""}
            onChange={e => setForm(p => ({ ...p, location: e.target.value || null }))}>
            <option value="">Select location</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Designation</label>
          <select className={inputClass} value={form.designation || ""}
            onChange={e => setForm(p => ({ ...p, designation: e.target.value || null }))}>
            <option value="">Select designation</option>
            {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Reporting Manager</label>
          <select className={inputClass} value={form.reporting_manager || ""}
            onChange={e => setForm(p => ({ ...p, reporting_manager: e.target.value || null }))}>
            <option value="">Select manager</option>
            {employees.filter(emp => emp.employee_name !== form.employee_name).map(emp => (
              <option key={emp.id} value={emp.employee_name}>{emp.employee_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Employment Status</label>
          <select className={inputClass} value={form.employment_status}
            onChange={e => setForm(p => ({ ...p, employment_status: e.target.value }))}>
            {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Date Joined</label>
          <input type="date" className={inputClass} value={form.date_joined || ""}
            onChange={e => setForm(p => ({ ...p, date_joined: e.target.value || null }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={addEmployee.isPending || updateEmployee.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Employee Master
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
            {/* Mode Toggle */}
            <div className="flex gap-2 mt-1">
              <Button variant={addMode === "single" ? "default" : "outline"} size="sm" onClick={() => setAddMode("single")} className="gap-1.5">
                <Plus size={14} /> Single Entry
              </Button>
              <Button variant={addMode === "bulk" ? "default" : "outline"} size="sm" onClick={() => setAddMode("bulk")} className="gap-1.5">
                <FileSpreadsheet size={14} /> Bulk Upload (Excel)
              </Button>
            </div>

            {addMode === "single" ? (
              renderForm(handleAdd, "Add Employee")
            ) : (
              <div className="space-y-4 mt-2">
                {/* Upload area */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3 bg-muted/30">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Upload Excel File (.xlsx, .xls, .csv)</p>
                    <p className="text-xs text-muted-foreground mt-1">File should have columns: Employee Name, Company Name, Location, Designation, etc.</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                      <Upload size={14} /> Choose File
                    </Button>
                    <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1.5">
                      <FileSpreadsheet size={14} /> Download Template
                    </Button>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                  {bulkFileName && <p className="text-xs text-primary font-medium">📎 {bulkFileName}</p>}
                </div>

                {/* Preview table */}
                {bulkData.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> Preview — {bulkData.length} employee{bulkData.length !== 1 ? "s" : ""} found
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => { setBulkData([]); setBulkFileName(""); }}>
                        <X size={14} className="mr-1" /> Clear
                      </Button>
                    </div>
                    <div className="max-h-60 overflow-auto border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkData.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="text-sm font-medium">{row.employee_name}</TableCell>
                              <TableCell className="text-xs">{row.company_name}</TableCell>
                              <TableCell className="text-xs">{row.location || "—"}</TableCell>
                              <TableCell className="text-xs">{row.designation || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={row.employment_status === "Active" ? "default" : "secondary"} className="text-[10px]">
                                  {row.employment_status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeBulkRow(i)}>
                                  <X size={12} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleBulkAdd} disabled={isBulkAdding} className="gap-1.5">
                        {isBulkAdding ? "Adding..." : `Add ${bulkData.length} Employees`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className={inputClass + " pl-9"} placeholder="Search by name or ID..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={inputClass + " w-auto"} value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading employees...</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Emp ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Reporting Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Joined</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : filtered.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-xs font-semibold">{emp.employee_id}</TableCell>
                  <TableCell className="font-semibold">{emp.employee_name}</TableCell>
                  <TableCell className="text-sm">{emp.company_name}</TableCell>
                  <TableCell className="text-sm">{emp.location || "—"}</TableCell>
                  <TableCell className="text-sm">{emp.designation || "—"}</TableCell>
                  <TableCell className="text-sm">{emp.reporting_manager || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={emp.employment_status === "Active" ? "default" : "secondary"}>
                      {emp.employment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{emp.date_joined || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {emp.employee_name}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(emp)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={open => { setEditDialogOpen(open); if (!open) { resetForm(); setEditingEmployee(null); } }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee — {editingEmployee?.employee_id}</DialogTitle></DialogHeader>
          {renderForm(handleEdit, "Save Changes")}
        </DialogContent>
      </Dialog>
    </div>
  );
}

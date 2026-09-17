"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Tag,
  FileText,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "nuevo" | "contactado" | "interesado" | "cliente" | "inactivo";
  notes?: string;
  source?: string;
  slug?: string;
  store?: string;
  createdAt: string;
}

const statusBadges: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  nuevo: { label: "Nuevo", variant: "default" },
  contactado: { label: "Contactado", variant: "secondary" },
  interesado: { label: "Interesado", variant: "outline" },
  cliente: { label: "Cliente", variant: "default" },
  inactivo: { label: "Inactivo", variant: "destructive" },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "nuevo",
    notes: "",
    source: "Manual",
  });

  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (statusFilter !== "all") queryParams.append("status", statusFilter);

      const res = await fetch(`/api/leads?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setLeads(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron cargar los clientes/leads",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error de conexión al obtener los leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "¡Éxito!",
          description: "Cliente/Lead creado exitosamente",
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          status: "nuevo",
          notes: "",
          source: "Manual",
        });
        setIsModalOpen(false);
        fetchLeads();
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo registrar el lead",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error inesperado al intentar guardar",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Clientes & Leads
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestión de prospectos, clientes potenciales y contactos.
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Agregar Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" /> Nuevo Cliente / Lead
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  placeholder="Ej: María Pérez"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="maria@ejemplo.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="+54 9 11 1234-5678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) =>
                      setFormData({ ...formData, status: val })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="contactado">Contactado</SelectItem>
                      <SelectItem value="interesado">Interesado</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Origen / Fuente</Label>
                  <Input
                    id="source"
                    placeholder="Instagram, Tienda, Recomendado..."
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas o Comentarios</Label>
                <Textarea
                  id="notes"
                  placeholder="Detalles sobre las preferencias o contacto..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Guardando..." : "Guardar Lead"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o tel..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="nuevo">Nuevo</SelectItem>
              <SelectItem value="contactado">Contactado</SelectItem>
              <SelectItem value="interesado">Interesado</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchLeads} title="Recargar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabla de Leads */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Cargando clientes y leads...
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron clientes o leads registrados.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const badgeInfo = statusBadges[lead.status] || {
                  label: lead.status,
                  variant: "secondary",
                };
                return (
                  <TableRow key={lead._id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        {lead.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </div>
                        )}
                        {!lead.email && !lead.phone && (
                          <span className="text-muted-foreground font-light">Sin datos</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeInfo.variant}>
                        {badgeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Tag className="h-3 w-3" /> {lead.source || "Manual"}
                        </span>
                        {lead.slug && (
                          <span className="text-[11px] text-muted-foreground/70">
                            Slug: {lead.slug}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {lead.notes || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString("es-AR")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

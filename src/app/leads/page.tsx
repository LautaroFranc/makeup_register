"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Tag,
  UserCheck,
  RefreshCw,
  Send,
  CheckSquare,
  Square,
  MailCheck,
  Sparkles,
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
import { buildEmailTemplate } from "@/lib/emailTemplate";

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

const statusBadges: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  nuevo: { label: "Nuevo", variant: "default" },
  contactado: { label: "Contactado", variant: "secondary" },
  interesado: { label: "Interesado", variant: "outline" },
  cliente: { label: "Cliente", variant: "default" },
  inactivo: { label: "Inactivo", variant: "destructive" },
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estado para selección de filas
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Estados para Modal de Configuración de Email de Bienvenida
  const [stores, setStores] = useState<any[]>([]);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [welcomeSubject, setWelcomeSubject] = useState("¡Gracias por registrarte!");
  const [welcomeTemplate, setWelcomeTemplate] = useState("");
  const [savingWelcomeEmail, setSavingWelcomeEmail] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "nuevo",
    notes: "",
    source: "Manual",
  });

  const { toast } = useToast();

  // Cargar tiendas para obtener la configuración del correo de bienvenida
  const fetchStoreConfig = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/stores", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.stores && data.stores.length > 0) {
        setStores(data.stores);
        const storeId = data.stores[0]._id;
        const detailRes = await fetch(`/api/stores?id=${storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const detailData = await detailRes.json();
        if (detailData.success && detailData.store?.settings) {
          setWelcomeSubject(
            detailData.store.settings.welcomeEmailSubject || "¡Gracias por registrarte!"
          );
          setWelcomeTemplate(
            detailData.store.settings.welcomeEmailTemplate || ""
          );
        }
      }
    } catch (err) {
      console.error("Error al cargar tiendas:", err);
    }
  };

  useEffect(() => {
    fetchStoreConfig();
  }, []);

  const handleSaveWelcomeEmail = async () => {
    if (!stores || stores.length === 0) {
      toast({
        title: "Error",
        description: "No se encontró una tienda asociada para guardar",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingWelcomeEmail(true);
      const token = localStorage.getItem("token");
      const storeId = stores[0]._id;

      const response = await fetch(`/api/stores?id=${storeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: {
            welcomeEmailSubject: welcomeSubject,
            welcomeEmailTemplate: welcomeTemplate,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "¡Plantilla Guardada!",
          description: "La plantilla del correo de bienvenida ha sido actualizada exitosamente.",
        });
        setIsWelcomeModalOpen(false);
      } else {
        throw new Error(result.error || "No se pudo actualizar la plantilla");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error al guardar la plantilla: ${error.message || error}`,
        variant: "destructive",
      });
    } finally {
      setSavingWelcomeEmail(false);
    }
  };

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

  const toggleSelectAll = () => {
    const leadsWithEmail = leads.filter((l) => l.email && l.email.includes("@"));
    if (selectedIds.length === leadsWithEmail.length && leadsWithEmail.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leadsWithEmail.map((l) => l._id));
    }
  };

  const toggleSelectLead = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleGoToNovedades = (target: "all" | "selected") => {
    if (target === "selected" && selectedIds.length === 0) {
      toast({
        title: "Selecciona al menos un cliente",
        description: "Por favor marca las casillas de los clientes a quienes deseas enviar la novedad.",
        variant: "destructive",
      });
      return;
    }

    const query = new URLSearchParams();
    query.append("target", target);
    if (target === "selected") {
      query.append("ids", selectedIds.join(","));
    }
    router.push(`/leads/novedades?${query.toString()}`);
  };

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

  const leadsWithEmail = leads.filter((l) => l.email && l.email.includes("@"));

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Clientes & Leads
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestión de prospectos, clientes potenciales y envío de novedades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón para configurar Email de Bienvenida */}
          <Dialog open={isWelcomeModalOpen} onOpenChange={setIsWelcomeModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <MailCheck className="h-4 w-4" />
                Email Bienvenida
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-purple-700">
                  <Sparkles className="h-5 w-5" /> Configurar Correo de Bienvenida
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground">
                  Personaliza el mensaje automático que reciben tus clientes al registrarse desde tu tienda pública.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="welcomeSubject">Asunto del Correo</Label>
                  <Input
                    id="welcomeSubject"
                    value={welcomeSubject}
                    onChange={(e) => setWelcomeSubject(e.target.value)}
                    placeholder="Ej: ¡Gracias por registrarte!"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="welcomeTemplate">Cuerpo del Correo (Texto o HTML)</Label>
                    <span className="text-[11px] text-purple-600 font-medium">
                      Variables: {"{name}"}, {"{tienda}"}
                    </span>
                  </div>
                  <Textarea
                    id="welcomeTemplate"
                    rows={6}
                    className="font-mono text-xs"
                    value={welcomeTemplate}
                    onChange={(e) => setWelcomeTemplate(e.target.value)}
                    placeholder="<h2>¡Hola {name}!</h2>\n<p>Gracias por unirte a {tienda}...</p>"
                  />
                </div>

                {/* Previsualización rápida */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Vista Previa</Label>
                  <div className="border rounded-md p-2 bg-muted/10 h-40 overflow-hidden">
                    <iframe
                      title="Preview Email Bienvenida Modal"
                      srcDoc={buildEmailTemplate({
                        storeName: stores[0]?.name || "Tu Tienda",
                        content: welcomeTemplate
                          ? welcomeTemplate
                              .replace(/{name}/gi, "María Pérez")
                              .replace(/{nombre}/gi, "María Pérez")
                              .replace(/{tienda}/gi, stores[0]?.name || "Tu Tienda")
                          : `<h2 style="color: #d946ef; text-align: center; margin-top: 0;">¡Gracias por registrarte, María Pérez!</h2><p style="font-size: 15px; color: #333;">Nos alegra mucho tenerte con nosotros.</p>`,
                        isHtml: true,
                        recipientEmail: "cliente@ejemplo.com",
                      })}
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsWelcomeModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveWelcomeEmail}
                    disabled={savingWelcomeEmail}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {savingWelcomeEmail ? "Guardando..." : "Guardar Plantilla"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Botón para redactar novedades */}
          <Button
            variant="outline"
            className="flex items-center gap-2 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => handleGoToNovedades(selectedIds.length > 0 ? "selected" : "all")}
          >
            <Send className="h-4 w-4" />
            {selectedIds.length > 0
              ? `Enviar Novedad (${selectedIds.length})`
              : "Enviar Novedades"}
          </Button>

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
              <TableHead className="w-[40px] text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="p-1 hover:text-primary transition-colors"
                  title="Seleccionar todos los que tienen email"
                >
                  {selectedIds.length > 0 &&
                  selectedIds.length === leadsWithEmail.length ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </TableHead>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Cargando clientes y leads...
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No se encontraron clientes o leads registrados.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const badgeInfo = statusBadges[lead.status] || {
                  label: lead.status,
                  variant: "secondary",
                };
                const hasValidEmail = Boolean(lead.email && lead.email.includes("@"));
                const isSelected = selectedIds.includes(lead._id);

                return (
                  <TableRow
                    key={lead._id}
                    className={isSelected ? "bg-primary/5" : ""}
                  >
                    <TableCell className="text-center">
                      <button
                        type="button"
                        disabled={!hasValidEmail}
                        onClick={() => toggleSelectLead(lead._id)}
                        className={`p-1 transition-colors ${
                          !hasValidEmail ? "opacity-30 cursor-not-allowed" : "hover:text-primary"
                        }`}
                        title={
                          hasValidEmail
                            ? "Seleccionar para novedad"
                            : "Este cliente no tiene correo electrónico"
                        }
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
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

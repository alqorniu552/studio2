"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createContainer } from "@/app/actions";
import { type Container, type CreateActionState } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { DeleteContainerButton } from "./delete-container-button";
import { Badge } from "@/components/ui/badge";
import { CircleDot, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: CreateActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Membuat..." : "Buat Klien"}
    </Button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isRunning = status === 'running';
  const isExited = status === 'exited';

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "border",
        isRunning && "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80",
        isExited && "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/80",
        !isRunning && !isExited && "bg-muted text-muted-foreground border-border"
      )}
    >
      {isRunning && <CircleDot className="mr-2 h-3 w-3 text-green-600 dark:text-green-400" />}
      {isExited && <PowerOff className="mr-2 h-3 w-3 text-red-600 dark:text-red-400" />}
      {!isRunning && !isExited && <CircleDot className="mr-2 h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}


export function ContainerClient({
  initialContainers,
  hostIp,
}: {
  initialContainers: Container[];
  hostIp: string;
}) {
  const [state, formAction] = useActionState(createContainer, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) {
      toast({
        variant: "destructive",
        title: "Gagal Membuat Klien",
        description: state.error,
      });
    }
    if (state.success) {
      toast({
        title: "Berhasil",
        description: "Kontainer klien berhasil dibuat.",
      });
      formRef.current?.reset();
    }
  }, [state, toast]);

  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Buat Klien Baru</CardTitle>
          <CardDescription>
            Buat instance kontainer baru. Port unik akan dialokasikan secara otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            action={formAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="client_name">Nama Klien (tanpa spasi)</Label>
              <Input
                id="client_name"
                name="client_name"
                required
                pattern="^\S+$"
                title="Nama tidak boleh mengandung spasi."
                placeholder="misal: klien-pertama"
              />
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-4 font-headline">
          Daftar Klien Aktif
        </h2>
        <Card className="shadow-md">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Klien</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Port Mapping</TableHead>
                  <TableHead>Cara Akses SSH</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialContainers.length > 0 ? (
                  initialContainers.map((container) => (
                    <TableRow key={container.id}>
                      <TableCell className="font-medium">
                        {container.name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={container.status} />
                      </TableCell>
                      <TableCell>{container.ports}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted p-2 rounded-md block whitespace-nowrap">
                          ssh root@{hostIp} -p {container.sshPort}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteContainerButton containerId={container.id} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Belum ada klien aktif. Buat satu untuk memulai.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
        <p className="mt-3 text-sm text-muted-foreground">
          <strong>Catatan:</strong> Password default tergantung pada image yang digunakan, misal: 'root' atau 'screencast'.
        </p>
      </div>
    </div>
  );
}

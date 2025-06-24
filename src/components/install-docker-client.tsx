
"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { installDocker } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ServerCrash, Terminal } from "lucide-react";

function InstallButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" variant="secondary" disabled={pending} className="mt-4">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menginstal Docker...
                </>
            ) : (
                "Instal Docker via SSH"
            )}
        </Button>
    );
}

export function InstallDockerClient() {
    const [state, formAction] = useActionState(installDocker, { success: false, error: undefined });

    useEffect(() => {
        if (state.success) {
            const timer = setTimeout(() => {
                if(typeof window !== 'undefined') window.location.reload();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [state.success]);

    if (state.success) {
        return (
             <Alert variant="default" className="mt-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Instalasi Berhasil!</AlertTitle>
                <AlertDescription>
                    Docker telah berhasil diinstal. Halaman akan dimuat ulang dalam 3 detik.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="mt-4 pt-4 border-t border-destructive/30">
            <p className="text-sm font-semibold">Anda dapat mencoba menginstalnya secara otomatis.</p>
            <p className="text-xs mt-1">Catatan: Ini memerlukan pengguna SSH untuk memiliki izin `sudo` tanpa kata sandi.</p>

            <form action={formAction}>
                <InstallButton />
            </form>
             {state.error && (
                 <Alert variant="destructive" className="mt-4">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Instalasi Gagal</AlertTitle>
                    <AlertDescription>
                        {state.error}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}

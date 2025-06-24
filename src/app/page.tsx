import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Container, LayoutDashboard, Rocket, Settings, LifeBuoy } from "lucide-react";
import { getContainers } from "@/app/actions";
import { ContainerClient } from "@/components/container-client";
import { InstallDockerClient } from "@/components/install-docker-client";
import { ConnectionError } from "@/components/connection-error";

export default async function Home() {
  let containers: any[] = [];
  let connectionError: string | null = null;
  let isDockerMissing = false;

  const hostIp = process.env.SSH_HOST || "";

  try {
    containers = await getContainers();
  } catch (error: any) {
    connectionError = error.message;
    if (connectionError?.includes("Docker tidak terinstal")) {
      isDockerMissing = true;
    }
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold font-headline text-primary-foreground group-data-[collapsible=icon]:hidden">
              ContainerPilot
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton isActive tooltip="Dasbor">
                  <LayoutDashboard />
                  <span className="font-headline">Dasbor</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/images">
                <SidebarMenuButton tooltip="Images">
                  <Container />
                  <span className="font-headline">Images</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/settings">
                <SidebarMenuButton tooltip="Pengaturan">
                  <Settings />
                  <span className="font-headline">Pengaturan</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
                <SidebarMenuButton tooltip="Bantuan">
                  <LifeBuoy />
                  <span className="font-headline">Bantuan</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Profil Pengguna">
                <Avatar className="size-7">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="user avatar" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="font-headline">Profil Pengguna</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm border-b sticky top-0 z-10 h-16">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <h1 className="text-2xl font-bold font-headline text-foreground hidden md:block">
            Manajer Klien VPS
          </h1>
          <div className="flex-1" />
           {/* Placeholder for future header actions */}
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          {connectionError ? (
            <div>
              <ConnectionError message={connectionError} />
              {isDockerMissing && <InstallDockerClient />}
            </div>
          ) : (
            <ContainerClient initialContainers={containers} hostIp={hostIp} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

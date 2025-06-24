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
import { Container, LayoutDashboard, Rocket, Settings, LifeBuoy, Terminal } from "lucide-react";
import { getContainers } from "@/app/actions";
import { ContainerClient } from "@/components/container-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InstallDockerClient } from "@/components/install-docker-client";

export default async function Home() {
  let containers: any[] = [];
  let connectionError: string | null = null;
  let isDockerMissing = false;

  const hostIp = process.env.SSH_HOST || "your_vps_ip";

  try {
    containers = await getContainers();
  } catch (error: any) {
    connectionError = error.message;
    if (connectionError?.includes("Docker is not installed")) {
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
                <SidebarMenuButton isActive tooltip="Dashboard">
                  <LayoutDashboard />
                  <span className="font-headline">Dashboard</span>
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
                <SidebarMenuButton tooltip="Settings">
                  <Settings />
                  <span className="font-headline">Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
                <SidebarMenuButton tooltip="Support">
                  <LifeBuoy />
                  <span className="font-headline">Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="User Profile">
                <Avatar className="size-7">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="user avatar" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="font-headline">User Profile</span>
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
            VPS Client Manager
          </h1>
          <div className="flex-1" />
           {/* Placeholder for future header actions */}
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          {connectionError ? (
             <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                <p className="font-semibold">{connectionError}</p>
                {!isDockerMissing && (
                  <>
                    <p className="mt-4 text-sm font-bold">Troubleshooting Steps:</p>
                    <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                      <li>Ensure the details in your <code>.env.local</code> file (host, username, password/key path) are correct.</li>
                      <li>After creating or modifying the <code>.env.local</code> file, you must restart the application server.</li>
                      <li>Check if your VPS firewall is blocking the SSH port (usually port 22).</li>
                    </ul>
                    <p className="mt-4 text-sm">For reference, here is an example of the <code>.env.local</code> file format:</p>
                    <pre className="mt-2 p-3 bg-slate-900/90 text-slate-100 rounded-md text-xs whitespace-pre-wrap font-code">
                      {`# .env.local Example\n\nSSH_HOST=your_vps_ip_address\nSSH_USERNAME=your_ssh_username\n# Use either password OR private key path\nSSH_PASSWORD=your_ssh_password\n# SSH_PRIVATE_KEY_PATH=/path/to/your/id_rsa`}
                    </pre>
                  </>
                )}
              </AlertDescription>
              {isDockerMissing && <InstallDockerClient />}
            </Alert>
          ) : (
            <ContainerClient initialContainers={containers} hostIp={hostIp} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

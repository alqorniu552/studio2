
"use server";

import { revalidatePath } from "next/cache";
import { type Container, type CreateActionState } from "@/lib/types";
import { NodeSSH } from "node-ssh";
import "dotenv/config";

const ssh = new NodeSSH();

async function connectSSH() {
  if (ssh.isConnected()) return;

  const sshConfig = {
    host: process.env.SSH_HOST,
    username: process.env.SSH_USERNAME,
    password: process.env.SSH_PASSWORD,
    privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
  };

  if (!sshConfig.host || !sshConfig.username || (!sshConfig.password && !sshConfig.privateKeyPath)) {
    throw new Error('Missing SSH connection details in .env.local file. Please set SSH_HOST, SSH_USERNAME, and either SSH_PASSWORD or SSH_PRIVATE_KEY_PATH.');
  }
  
  await ssh.connect(sshConfig);
}

const BASE_SSH_PORT = 2200;
const DOCKER_IMAGE = "rastasheep/ubuntu-sshd:18.04";

function parseSshPort(portString: string): number | null {
  const match = portString.match(/0\.0\.0\.0:(\d+)->22\/tcp/);
  return match ? parseInt(match[1], 10) : null;
}

export async function getContainers(): Promise<Container[]> {
    await connectSSH();
    const result = await ssh.execCommand('docker ps -a --format "{{json .}}"');

    if (result.code !== 0) {
        const stderr = result.stderr || "Unknown Docker error on the remote server.";
        console.error('Error fetching containers:', stderr);
        if (stderr.includes('command not found')) {
            throw new Error("Docker is not installed or accessible on the remote server.");
        }
        throw new Error(stderr);
    }
    
    if (!result.stdout) {
      return [];
    }

    const dockerContainers = result.stdout
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error("Failed to parse Docker output line:", line, e);
          return null;
        }
      })
      .filter(Boolean);

    return dockerContainers.map((c: any): Container => ({
      id: c.ID,
      name: c.Names,
      ports: c.Ports,
      sshPort: parseSshPort(c.Ports) || 0,
      status: c.State,
      image: c.Image,
    }));
}


async function getNextAvailablePort(): Promise<number> {
    const containers = await getContainers();
    if (containers.length === 0) {
      return BASE_SSH_PORT + 1;
    }
    const usedPorts = new Set(containers.map(c => c.sshPort).filter(p => p > 0));
    let nextPort = BASE_SSH_PORT + 1;
    while (usedPorts.has(nextPort)) {
      nextPort += 1;
    }
    return nextPort;
}


export async function createContainer(prevState: CreateActionState, formData: FormData): Promise<CreateActionState> {
  const clientName = formData.get("client_name") as string;

  if (!clientName || clientName.trim().length === 0) {
    return { error: "Client name cannot be empty." };
  }
  
  if (/\s/.test(clientName)) {
    return { error: "Client name cannot contain spaces." };
  }

  try {
    const existingContainers = await getContainers();
    if (existingContainers.some(c => c.name === clientName)) {
      return { error: `A container with the name "${clientName}" already exists.` };
    }

    const sshPort = await getNextAvailablePort();
    
    await connectSSH();

    const command = `docker run -d --name ${clientName} -p ${sshPort}:22 ${DOCKER_IMAGE}`;
    const result = await ssh.execCommand(command);

    if (result.code !== 0 || result.stderr) {
        console.error('Error creating container:', result.stderr);
        return { error: `Failed to create container: ${result.stderr}` };
    }

    revalidatePath("/");
    return { success: true };

  } catch (e: any) {
    console.error("Error creating container:", e);
    return { error: e.message || "An unexpected error occurred while creating the container." };
  }
}

export async function deleteContainer(formData: FormData) {
    const containerId = formData.get('containerId') as string;

    if(!containerId) {
        throw new Error("Container ID is required.");
    }

    try {
        await connectSSH();
        const command = `docker rm -f ${containerId}`;
        const result = await ssh.execCommand(command);
        
        if (result.code !== 0 && result.stderr) {
            console.error(`Error deleting container ${containerId}:`, result.stderr);
            // In a real app, you might want to return an error state instead of throwing.
            // For now, we just log it.
        }

        revalidatePath("/");
    } catch (e) {
        console.error("Error deleting container:", e);
        throw new Error("Failed to delete container.");
    }
}

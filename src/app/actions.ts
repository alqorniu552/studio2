
"use server";

import { revalidatePath } from "next/cache";
import { type Container, type CreateActionState, type Image } from "@/lib/types";
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
        if (stderr.includes('command not found') || stderr.includes('not found: docker')) {
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
        }

        revalidatePath("/");
    } catch (e) {
        console.error("Error deleting container:", e);
        throw new Error("Failed to delete container.");
    }
}

const DOCKER_INSTALL_COMMAND = "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh";
const ADD_USER_TO_DOCKER_GROUP_COMMAND = `sudo usermod -aG docker ${process.env.SSH_USERNAME}`;

export async function installDocker(prevState: { error?: string | null, success?: boolean }, formData: FormData): Promise<{ error?: string | null, success?: boolean }> {
  try {
    await connectSSH();

    const result = await ssh.execCommand(DOCKER_INSTALL_COMMAND, {
      execOptions: { pty: true }
    });

    if (result.code !== 0) {
      if (result.stderr.includes('sudo: a password is required') || result.stderr.includes('sudo: no tty present')) {
        return { error: "Installation requires passwordless `sudo` privileges for the SSH user." };
      }
      console.error('Docker installation failed:', result.stderr);
      return { error: `Script failed. Stderr: ${result.stderr}` };
    }
    
    await ssh.execCommand(ADD_USER_TO_DOCKER_GROUP_COMMAND);

    return { success: true };

  } catch (e: any) {
    console.error("Error installing Docker:", e);
    return { error: e.message || "An unexpected error occurred during installation." };
  }
}

export async function getImages(): Promise<Image[]> {
    await connectSSH();
    const result = await ssh.execCommand('docker images --format "{{json .}}"');

    if (result.code !== 0) {
        const stderr = result.stderr || "Unknown Docker error on the remote server.";
        if (stderr.includes('command not found') || stderr.includes('not found: docker')) {
            throw new Error("Docker is not installed or accessible on the remote server.");
        }
        throw new Error(stderr);
    }

    if (!result.stdout) {
      return [];
    }

    const dockerImages = result.stdout
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error("Failed to parse Docker image output line:", line, e);
          return null;
        }
      })
      .filter(Boolean);

    return dockerImages.map((img: any): Image => ({
      id: img.ID,
      repository: img.Repository,
      tag: img.Tag,
      size: img.Size,
      created: img.CreatedSince,
    }));
}

export async function deleteImage(formData: FormData) {
    const imageId = formData.get('imageId') as string;

    if(!imageId) {
        throw new Error("Image ID is required.");
    }

    try {
        await connectSSH();
        const command = `docker rmi -f ${imageId}`;
        const result = await ssh.execCommand(command);

        if (result.code !== 0 && result.stderr) {
            console.error(`Error deleting image ${imageId}:`, result.stderr);
        }

        revalidatePath("/images");
    } catch (e) {
        console.error("Error deleting image:", e);
        throw new Error("Failed to delete image.");
    }
}

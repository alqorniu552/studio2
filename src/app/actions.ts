
"use server";

import { revalidatePath } from "next/cache";
import { type Container, type CreateActionState, type Image } from "@/lib/types";
import { NodeSSH } from "node-ssh";
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const ssh = new NodeSSH();

async function connectSSH() {
  if (ssh.isConnected()) return;

  const host = process.env.SSH_HOST;
  const username = process.env.SSH_USERNAME;
  const password = process.env.SSH_PASSWORD;
  let privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;

  if (!host || !username || (!password && !privateKeyPath)) {
    const missingEnvMessage = 'Koneksi Gagal: File `.env.local` belum lengkap.\n\n' +
        'Pastikan file `.env.local` ada di direktori utama proyek Anda dan berisi semua detail yang diperlukan, seperti contoh di bawah ini. Ganti nilai placeholder dengan informasi VPS Anda.\n\n' +
        'Contoh Isi File `.env.local`:\n' +
        'SSH_HOST=123.45.67.89\n' +
        'SSH_USERNAME=root\n' +
        'SSH_PASSWORD=PasswordRahasiaAnda\n\n' +
        'Penting: Setelah membuat atau mengubah file ini, Anda **wajib** me-restart server aplikasi ini (hentikan dengan Ctrl+C, lalu jalankan lagi).';
    throw new Error(missingEnvMessage);
  }

  // Proactively check private key path if provided
  if (privateKeyPath) {
    // Expand tilde (~) to home directory
    if (privateKeyPath.startsWith('~' + path.sep)) {
      privateKeyPath = path.join(os.homedir(), privateKeyPath.slice(1));
    }

    try {
      // Check if file exists and is accessible
      await fs.access(privateKeyPath);
    } catch (e) {
        const keyPathDebugMessage = 'Kunci SSH Privat Tidak Ditemukan atau Tidak Dapat Diakses.\n\n' +
        'Aplikasi gagal membaca file kunci di path yang Anda tentukan.\n\n' +
        `Path yang dicoba: ${privateKeyPath}` + '\n\n' +
        'Mari kita periksa dengan teliti:\n\n' +
        '1. **Pastikan Path Sudah Benar.** Apakah path di atas sudah 100% benar? Periksa setiap huruf, garis miring, dan titik.\n\n' +
        '2. **Gunakan Path Absolut.** Path harus lengkap dari direktori root. Contoh Benar:\n' +
        '   - Linux/macOS: `/home/namaanda/.ssh/id_rsa`\n' +
        '   - Windows: `C:/Users/NamaAnda/.ssh/id_rsa`\n\n' +
        '3. **Periksa Nama File.** Pastikan Anda menunjuk ke file kunci **privat** (misalnya `id_rsa`), bukan kunci publik (`id_rsa.pub`).\n\n' +
        '4. **Periksa Izin Akses.** Pastikan pengguna yang menjalankan aplikasi ini memiliki izin untuk membaca file kunci tersebut.';
        
        throw new Error(keyPathDebugMessage);
    }
  }


  const sshConfig: {
    host: string;
    username: string;
    password?: string;
    privateKeyPath?: string;
  } = {
    host,
    username,
  };

  if (password) {
    sshConfig.password = password;
  }
  if (privateKeyPath) {
    sshConfig.privateKeyPath = privateKeyPath;
  }
  
  try {
    await ssh.connect(sshConfig);
  } catch (error: any) {
    if (error.message.includes('All configured authentication methods failed')) {
      const authDebugMessage = 'Otentikasi Gagal. VPS menolak login.\n\n' +
        'Ini adalah masalah paling umum. Mari kita periksa langkah demi langkah dengan sangat teliti:\n\n' +
        '1. Pastikan `SSH_USERNAME` dan `SSH_PASSWORD` (jika menggunakan password) di file `.env.local` Anda sudah 100% benar. Cara terbaik adalah menyalin dan menempelkannya langsung.\n\n' +
        '2. Jika menggunakan password, pastikan VPS Anda mengizinkannya. Edit file `/etc/ssh/sshd_config` di VPS, dan pastikan baris `PasswordAuthentication yes` aktif (tidak ada # di depannya).\n\n' +
        '3. Jika menggunakan kunci SSH, pastikan kunci publik Anda (isi dari file `.pub\`) sudah ditambahkan ke file `~/.ssh/authorized_keys` di VPS.\n\n' +
        '4. Setelah mengedit file `sshd_config` atau `authorized_keys` di VPS, Anda **WAJIB** me-restart layanan SSH dengan perintah `sudo systemctl restart ssh`.\n\n' +
        '5. Setiap kali Anda mengubah file `.env.local`, Anda **WAJIB** me-restart server aplikasi ini (hentikan dengan Ctrl+C, lalu jalankan lagi).';
      
      throw new Error(authDebugMessage);
    }
    // Re-throw other types of errors
    throw error;
  }
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
            throw new Error("Docker tidak terinstal atau tidak dapat diakses di server remote.");
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
    return { error: "Nama klien tidak boleh kosong." };
  }
  
  if (/\s/.test(clientName)) {
    return { error: "Nama klien tidak boleh mengandung spasi." };
  }

  try {
    const existingContainers = await getContainers();
    if (existingContainers.some(c => c.name === clientName)) {
      return { error: `Kontainer dengan nama "${clientName}" sudah ada.` };
    }

    const sshPort = await getNextAvailablePort();
    
    await connectSSH();

    const command = `docker run -d --name ${clientName} -p ${sshPort}:22 ${DOCKER_IMAGE}`;
    const result = await ssh.execCommand(command);

    if (result.code !== 0 || result.stderr) {
        console.error('Gagal membuat kontainer:', result.stderr);
        return { error: `Gagal membuat kontainer: ${result.stderr}` };
    }

    revalidatePath("/");
    return { success: true };

  } catch (e: any) {
    console.error("Gagal membuat kontainer:", e);
    return { error: e.message || "Terjadi kesalahan tak terduga saat membuat kontainer." };
  }
}

export async function deleteContainer(formData: FormData) {
    const containerId = formData.get('containerId') as string;

    if(!containerId) {
        throw new Error("ID Kontainer dibutuhkan.");
    }

    try {
        await connectSSH();
        const command = `docker rm -f ${containerId}`;
        const result = await ssh.execCommand(command);
        
        if (result.code !== 0 && result.stderr) {
            console.error(`Gagal menghapus kontainer ${containerId}:`, result.stderr);
        }

        revalidatePath("/");
    } catch (e) {
        console.error("Gagal menghapus kontainer:", e);
        throw new Error("Gagal menghapus kontainer.");
    }
}

export async function installDocker(prevState: { error?: string | null, success?: boolean }, formData: FormData): Promise<{ error?: string | null, success?: boolean }> {
  try {
    await connectSSH();

    const DOCKER_INSTALL_COMMAND = "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh";
    const result = await ssh.execCommand(DOCKER_INSTALL_COMMAND, {
      execOptions: { pty: true }
    });

    if (result.code !== 0) {
      if (result.stderr.includes('sudo: a password is required') || result.stderr.includes('sudo: no tty present')) {
        return { error: "Instalasi memerlukan hak akses `sudo` tanpa kata sandi untuk pengguna SSH." };
      }
      console.error('Instalasi Docker gagal:', result.stderr);
      return { error: `Skrip gagal. Stderr: ${result.stderr}` };
    }
    
    return { success: true };

  } catch (e: any) {
    console.error("Gagal menginstal Docker:", e);
    return { error: e.message || "Terjadi kesalahan tak terduga saat instalasi." };
  }
}

export async function getImages(): Promise<Image[]> {
    await connectSSH();
    const result = await ssh.execCommand('docker images --format "{{json .}}"');

    if (result.code !== 0) {
        const stderr = result.stderr || "Unknown Docker error on the remote server.";
        if (stderr.includes('command not found') || stderr.includes('not found: docker')) {
            throw new Error("Docker tidak terinstal atau tidak dapat diakses di server remote.");
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
          console.error("Gagal mem-parsing output image Docker:", line, e);
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
        throw new Error("ID Image dibutuhkan.");
    }

    try {
        await connectSSH();
        const command = `docker rmi -f ${imageId}`;
        const result = await ssh.execCommand(command);

        if (result.code !== 0 && result.stderr) {
            console.error(`Gagal menghapus image ${imageId}:`, result.stderr);
        }

        revalidatePath("/images");
    } catch (e) {
        console.error("Gagal menghapus image:", e);
        throw new Error("Gagal menghapus image.");
    }
}

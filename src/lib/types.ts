export type Container = {
  id: string;
  name: string;
  ports: string;
  sshPort: number;
  status: 'running';
  image: string;
};

export type CreateActionState = {
  error?: string | null;
  success?: boolean;
};

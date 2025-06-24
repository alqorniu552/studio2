"use client";

import {
  Card
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Image } from "@/lib/types";
import { DeleteImageButton } from "./delete-image-button";

export function ImageClient({
  initialImages,
}: {
  initialImages: Image[];
}) {

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-4 font-headline">
          Image Docker
        </h2>
        <Card className="shadow-md">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repositori</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>ID Image</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialImages.length > 0 ? (
                  initialImages.map((image) => (
                    <TableRow key={image.id}>
                      <TableCell className="font-medium">
                        {image.repository}
                      </TableCell>
                       <TableCell>{image.tag}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted p-1 rounded-sm">{image.id.substring(0, 12)}</code>
                      </TableCell>
                      <TableCell>{image.created}</TableCell>
                      <TableCell>{image.size}</TableCell>
                      <TableCell className="text-right">
                        <DeleteImageButton imageId={image.id} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Tidak ada image yang ditemukan di server.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

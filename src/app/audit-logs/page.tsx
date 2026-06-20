import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableWrap } from "@/components/ui/table";
import { formatDate } from "@/lib/lead-utils";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const entityType = one(params.entityType);
  const action = one(params.action);
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(action ? { action: { contains: action } } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const entityTypes = await prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Audit Logs</h2>
        <p className="mt-1 text-sm text-neutral-600">Recent safety, compliance, sending, import, scoring, and sync actions.</p>
      </div>
      <Card>
        <form className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <Select name="entityType" defaultValue={entityType}>
            <option value="">All entities</option>
            {entityTypes.map((item) => <option key={item.entityType}>{item.entityType}</option>)}
          </Select>
          <Input name="action" defaultValue={action} placeholder="Filter by action" />
          <Button>Filter</Button>
        </form>
      </Card>
      <TableWrap>
        <Table className="min-w-[1100px]">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr><th className="px-3 py-3">When</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Entity</th><th className="px-3 py-3">Reason</th><th className="px-3 py-3">Metadata</th></tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {logs.map((log) => (
              <tr key={log.id} className="align-top">
                <td className="px-3 py-3">{formatDate(log.createdAt)}</td>
                <td className="px-3 py-3 font-medium">{log.action}</td>
                <td className="px-3 py-3">{log.entityType}<div className="text-xs text-neutral-500">{log.entityId}</div></td>
                <td className="max-w-[360px] px-3 py-3">{log.reason}</td>
                <td className="max-w-[420px] px-3 py-3 text-xs text-neutral-600">{log.metadata}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}

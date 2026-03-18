import * as XLSX from 'xlsx';
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  Database,
  Bell,
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  MoreVertical,
  LogOut,
  User as UserIcon,
  Building2,
  DollarSign,
  Tag,
  Eye,
  Star,
  Columns3,
  Check,
  History,
  RotateCcw,
  Trash2,
  ChevronDown,
  Lock,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { format, addDays, isAfter, isBefore, parseISO, differenceInDays, isValid } from 'date-fns';
import { cn, License, User, DashboardStats, RenewalHistory } from './lib/utils';

// --- Utils ---

const getLicenseStatus = (expiryDateStr: string | null | undefined, isImportant: boolean = false): 'active' | 'expiring' | 'expired' | 'unknown' => {
  if (!expiryDateStr) return 'unknown';
  const date = parseISO(expiryDateStr);
  if (!isValid(date)) return 'unknown';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (expiryDate < today) return 'expired';

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const expiryMonth = date.getMonth();
  const expiryYear = date.getFullYear();

  const monthsDiff = (expiryYear - currentYear) * 12 + (expiryMonth - currentMonth);

  if (isImportant) {
    if (monthsDiff >= 0 && monthsDiff <= 3) return 'expiring';
  } else {
    if (monthsDiff === 0 || monthsDiff === 1) return 'expiring';
  }
  return 'active';
};

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  const normalized = (dateStr.includes(' ') && !dateStr.includes('Z') && !dateStr.includes('+'))
    ? dateStr.replace(' ', 'T') + 'Z'
    : dateStr;
  const date = parseISO(normalized);
  return isValid(date) ? format(date, 'dd/MM/yyyy HH:mm') : dateStr;
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: { icon: any, label: string, active?: boolean, onClick: () => void, collapsed?: boolean }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center transition-all duration-200 group rounded-xl",
      collapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 w-full px-4 py-3",
      active
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
    title={collapsed ? label : ""}
  >
    <Icon size={20} className={cn("transition-transform duration-200 shrink-0", active ? "scale-110" : "group-hover:scale-110")} />
    {!collapsed && <span className="font-medium truncate">{label}</span>}
  </button>
);

const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-xl group-hover:scale-105 transition-transform duration-300", color)}>
        <Icon size={22} className="text-white" />
      </div>
      {trend && (
        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", trend.startsWith('+') ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100")}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">{title}</h3>
    <p className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</p>
  </div>
);

// --- Views ---

const DashboardView = ({ stats, licenses }: { stats: DashboardStats | null, licenses: License[] }) => {
  const [expiringTab, setExpiringTab] = useState<1 | 2 | 3>(1);
  const [expiringPage, setExpiringPage] = useState(1);

  if (!stats) return <div className="animate-pulse">Loading dashboard...</div>;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
  const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const pieData = [
    { name: 'Đang hoạt động', value: stats.summary.active },
    { name: 'Sắp hết hạn', value: stats.summary.expiringSoon },
    { name: 'Đã hết hạn', value: stats.summary.expired },
  ];

  const getMonthsDiff = (expiryDateStr: string | null | undefined) => {
    if (!expiryDateStr) return -1;
    const date = parseISO(expiryDateStr);
    if (!isValid(date)) return -1;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (expiryDate < today) return -1;
    return (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
  };

  const expiringByMonth = {
    1: licenses.filter(l => [0, 1].includes(getMonthsDiff(l.expiry_date))).sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()),
    2: licenses.filter(l => getMonthsDiff(l.expiry_date) === 2).sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()),
    3: licenses.filter(l => getMonthsDiff(l.expiry_date) === 3).sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()),
  };

  const categoryStats = licenses.reduce((acc: Record<string, number>, curr) => {
    const cat = curr.category || 'Chưa phân loại';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryData = Object.keys(categoryStats).map(key => ({
    category: key,
    count: categoryStats[key]
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng License" value={stats.summary.total} icon={Database} color="bg-indigo-500" />
        <StatCard title="Đang hoạt động" value={stats.summary.active} icon={CheckCircle2} color="bg-emerald-500" />
        <StatCard title="Sắp hết hạn" value={stats.summary.expiringSoon} icon={Clock} color="bg-amber-500" />
        <StatCard title="Đã hết hạn" value={stats.summary.expired} icon={XCircle} color="bg-rose-500" />
      </div>

      {stats.importantSummary && stats.importantSummary.total > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 opacity-50" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <Star className="text-amber-500 fill-amber-500" size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">License Quan Trọng Đặc Biệt ({stats.importantSummary.total})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 group">
              <div className="p-2 rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Đang hoạt động</p>
                <p className="text-xl font-semibold text-emerald-700">{stats.importantSummary.active}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
              <div className="p-2 rounded-lg bg-amber-500 text-white shadow-lg shadow-amber-200">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Sắp hết hạn</p>
                <p className="text-xl font-semibold text-amber-700">{stats.importantSummary.expiringSoon}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-rose-50/50 border border-rose-100">
              <div className="p-2 rounded-lg bg-rose-500 text-white shadow-lg shadow-rose-200">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-0.5">Đã hết hạn</p>
                <p className="text-xl font-semibold text-rose-700">{stats.importantSummary.expired}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-bold text-slate-800 mb-4 tracking-tight">Chi tiết dịch vụ ưu tiên cao</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {licenses.filter(l => l.is_important).sort((a, b) => {
                const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
                const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
                return dateA - dateB;
              }).map(l => {
                const status = getLicenseStatus(l.expiry_date, true);
                return (
                  <div key={l.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between h-auto gap-3">
                    <div>
                      <h5 className="text-sm font-black text-slate-900 line-clamp-2 leading-tight" title={l.name}>{l.name}</h5>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">{l.provider || 'Chưa rõ NCC'}</p>
                    </div>
                    <div className="flex justify-between items-center mt-auto">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider",
                        status === 'expired' ? "bg-rose-100 text-rose-700" :
                          status === 'expiring' ? "bg-amber-100 text-amber-700" :
                            "bg-emerald-100 text-emerald-700"
                      )}>
                        {status === 'expired' ? 'Đã hết hạn' :
                          status === 'expiring' ? 'Sắp tới hạn' : 'Đang HĐ'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {l.expiry_date ? format(parseISO(l.expiry_date), 'dd/MM/yyyy') : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-base font-black text-slate-900 mb-6 tracking-tight">Trạng thái License</h3>
          <div className="h-[280px] flex flex-col items-center justify-center">
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng</p>
                <p className="text-xl font-semibold text-slate-900 leading-none">{stats.summary.total}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full mt-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[index] }} />
                    <span className="text-[9px] font-bold text-slate-500 uppercase truncate">{entry.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-base font-black text-slate-900 mb-6 tracking-tight">Dự báo gia hạn (6 tháng tới)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyRenewals || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  animationDuration={1500}
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-base font-black text-slate-900 mb-6 tracking-tight">Cơ cấu loại dịch vụ</h3>
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="category"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc', radius: 4 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-black text-slate-900 tracking-tight">License sắp hết hạn</h3>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
              {[1, 2, 3].map((month) => (
                <button
                  key={month}
                  onClick={() => { setExpiringTab(month as 1 | 2 | 3); setExpiringPage(1); }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all",
                    expiringTab === month ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {month} Tháng
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const list = expiringByMonth[expiringTab] || [];
            const totalItems = list.length;
            const itemsPerPage = 8;
            const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
            const paginatedList = list.slice((expiringPage - 1) * itemsPerPage, expiringPage * itemsPerPage);

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar content-start">
                  {paginatedList.length > 0 ? paginatedList.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group h-[72px]">
                      <div className="overflow-hidden pr-2">
                        <p className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{l.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{format(parseISO(l.expiry_date || ''), 'dd/MM/yyyy')}</p>
                      </div>
                      <div className="shrink-0 ml-3">
                        <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100 whitespace-nowrap">
                          {expiringTab === 1 ? 'Sắp hết' : `${expiringTab} tháng tới`}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full flex flex-col items-center justify-center h-full">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} className="text-emerald-500 opacity-50" />
                      </div>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Không có cảnh báo</p>
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      Hiển thị {(expiringPage - 1) * itemsPerPage + 1} - {Math.min(expiringPage * itemsPerPage, totalItems)} trong số {totalItems}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpiringPage(p => Math.max(1, p - 1))}
                        disabled={expiringPage === 1}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} className="rotate-180" />
                      </button>
                      <button
                        onClick={() => setExpiringPage(p => Math.min(totalPages, p + 1))}
                        disabled={expiringPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

const LicenseDetailModal = ({ license, onClose }: { license: License, onClose: () => void }) => {
  const DetailItem = ({ label, value, isLink = false }: { label: string, value: any, isLink?: boolean }) => (
    <div className="space-y-1">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      {isLink && value ? (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-indigo-600 hover:underline block truncate"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm font-semibold text-slate-900">{value || '-'}</p>
      )}
    </div>
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : dateStr;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Chi tiết License</h2>
              <p className="text-xs text-slate-500 mt-1">ID: #{license.id}</p>
            </div>
            {!!license.is_important && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black uppercase shadow-sm">
                <Star size={14} className="fill-amber-500 text-amber-500" />
                Quan Trọng
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all shadow-sm">
            <XCircle size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Thông tin chung</h3>
              <DetailItem label="Tên dịch vụ/License" value={license.name} />
              <DetailItem label="Phân loại" value={license.category} />
              <DetailItem label="Serial/Mã kênh" value={license.serial_number} />
              <DetailItem label="Mô tả" value={license.description} />
              <DetailItem label="Phạm vi hệ thống" value={license.system_scope} />
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Thời hạn & Trạng thái</h3>
              <DetailItem label="Ngày cấp" value={formatDate(license.issue_date)} />
              <DetailItem label="Ngày hết hạn" value={formatDate(license.expiry_date)} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</p>
                <div className="pt-1">
                  {(() => {
                    const status = getLicenseStatus(license.expiry_date, license.is_important);
                    if (status === 'expired') return <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-black uppercase">Đã hết hạn</span>;
                    if (status === 'expiring') return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-black uppercase">Sắp hết hạn</span>;
                    if (status === 'active') return <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black uppercase">Đang hoạt động</span>;
                    return '-';
                  })()}
                </div>
              </div>
              <DetailItem label="Bộ phận" value={license.department} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Hợp đồng & Chi phí</h3>
              <DetailItem label="Nhà cung cấp" value={license.provider} />
              <DetailItem label="Mã dịch vụ" value={license.service_code} />
              <DetailItem label="Mã hợp đồng" value={license.contract_code} />
              <DetailItem label="Chi phí" value={license.cost ? `${license.cost.toLocaleString()} ${license.currency || 'VND'}` : '-'} />
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Liên hệ & Khác</h3>
              <DetailItem label="LH Kinh doanh" value={license.business_contact} />
              <DetailItem label="LH Kỹ thuật" value={license.technical_contact} />
              <DetailItem label="Website" value={license.website} isLink />
              <DetailItem label="Ghi chú" value={license.notes} />
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Đóng</button>
        </div>
      </motion.div>
    </div>
  );
};

const RenewalHistoryModal = ({ license, onClose }: { license: License, onClose: () => void }) => {
  const [history, setHistory] = useState<RenewalHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/licenses/${license.id}/history`);
        const data = await res.json();
        setHistory(data);
      } catch (error) {
        console.error('Error fetching renewal history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [license.id]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900">Lịch sử gia hạn</h2>
            <p className="text-xs text-slate-500 mt-1">{license.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all">
            <XCircle size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mb-4" />
              <p className="text-slate-500 font-bold text-sm">Đang tải lịch sử...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <History size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">Chưa có lịch sử gia hạn nào được ghi nhận.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-md transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ngày gia hạn</p>
                      <p className="text-sm font-bold text-slate-900">{formatDateTime(h.renewed_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Thời hạn cũ</p>
                      <p className="text-sm font-semibold text-slate-500 line-through">{h.previous_expiry ? format(parseISO(h.previous_expiry), 'dd/MM/yyyy') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Thời hạn mới</p>
                      <p className="text-sm font-bold text-indigo-600">{h.new_expiry ? format(parseISO(h.new_expiry), 'dd/MM/yyyy') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chi phí</p>
                      <p className="text-sm font-bold text-slate-900">{h.cost?.toLocaleString() || 0} VND</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quy trình thanh toán</p>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                      {h.payment_process || 'Không có thông tin quy trình.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Đóng</button>
        </div>
      </motion.div >
    </div >
  );
};

const BulkRenewModal = ({ isOpen, onClose, onRenew, licenses }: { isOpen: boolean, onClose: () => void, onRenew: (renewals: { id: number, expiry_date: string, payment_process: string, cost?: number }[]) => void, licenses: License[] }) => {
  const [renewals, setRenewals] = useState<{ id: number, expiry_date: string, payment_process: string, cost?: number }[]>([]);
  const [bulkPaymentProcess, setBulkPaymentProcess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRenewals(licenses.map(l => ({
        id: l.id,
        expiry_date: format(addDays(new Date(l.expiry_date || new Date()), 365), 'yyyy-MM-dd'),
        payment_process: l.payment_process || '',
        cost: l.cost
      })));
      setBulkPaymentProcess('');
    }
  }, [isOpen, licenses]);

  const handleUpdate = (id: number, field: string, value: any) => {
    setRenewals(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleBulkDateChange = (date: string) => {
    if (!date) return;
    setRenewals(prev => prev.map(r => ({ ...r, expiry_date: date })));
  };

  const replicatePaymentProcess = () => {
    setRenewals(prev => prev.map(r => ({ ...r, payment_process: bulkPaymentProcess })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 pb-4 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-slate-900">Gia hạn hàng loạt</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <XCircle size={24} className="text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-indigo-50 rounded-2xl flex items-start gap-3">
              <RotateCcw className="text-indigo-600 shrink-0 mt-1" size={20} />
              <div>
                <p className="text-sm font-bold text-indigo-900">Gia hạn cho {licenses.length} license</p>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs font-bold text-indigo-700 whitespace-nowrap">Áp dụng ngày chung:</label>
                  <input
                    type="date"
                    onChange={(e) => handleBulkDateChange(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-emerald-600" size={18} />
                <p className="text-sm font-bold text-emerald-900">Nhân bản Quy trình thanh toán</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập quy trình chung..."
                  value={bulkPaymentProcess}
                  onChange={(e) => setBulkPaymentProcess(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                />
                <button
                  onClick={replicatePaymentProcess}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  Nhân bản
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          <div className="space-y-4 pb-6">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <div className="col-span-5">License / Ngày cũ</div>
              <div className="col-span-3">Ngày hết hạn mới</div>
              <div className="col-span-4">Quy trình thanh toán</div>
            </div>
            {licenses.map(license => {
              const renewal = renewals.find(r => r.id === license.id);
              return (
                <div key={license.id} className="grid grid-cols-12 gap-4 items-center p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all group">
                  <div className="col-span-5 min-w-0">
                    <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{license.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">Cũ: {license.expiry_date ? format(new Date(license.expiry_date), 'dd/MM/yyyy') : 'N/A'}</p>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="date"
                      value={renewal?.expiry_date || ''}
                      onChange={(e) => handleUpdate(license.id, 'expiry_date', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-bold"
                    />
                  </div>
                  <div className="col-span-4">
                    <textarea
                      rows={1}
                      placeholder="Quy trình thanh toán..."
                      value={renewal?.payment_process || ''}
                      onChange={(e) => handleUpdate(license.id, 'payment_process', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs resize-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-all">Hủy bỏ</button>
          <button
            onClick={() => onRenew(renewals)}
            className="flex-1 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Xác nhận gia hạn
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TrashView = ({ onRestore }: { onRestore: () => void }) => {
  const [trashLicenses, setTrashLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    try {
      const res = await fetch('/api/licenses/trash');
      const data = await res.json();
      setTrashLicenses(data);
    } catch (error) {
      console.error('Error fetching trash:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: number) => {
    try {
      const res = await fetch(`/api/licenses/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        fetchTrash();
        onRestore();
      }
    } catch (error) {
      console.error('Error restoring license:', error);
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm('Bản ghi này sẽ bị xóa VĨNH VIỄN và không thể khôi phục. Bạn chắc chắn chứ?')) return;
    try {
      const res = await fetch(`/api/licenses/${id}/permanent`, { method: 'DELETE' });
      if (res.ok) {
        fetchTrash();
      }
    } catch (error) {
      console.error('Error permanent deleting license:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-900">Thùng rác</h3>
          <p className="text-sm text-slate-500">Các license đã xóa sẽ tự động bị xóa vĩnh viễn sau 30 ngày.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Đang tải thùng rác...</div>
        ) : trashLicenses.length === 0 ? (
          <div className="p-20 text-center text-slate-400 flex flex-col items-center">
            <Trash2 size={48} className="text-slate-200 mb-4" />
            <p className="font-bold">Thùng rác trống</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">License</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Ngày xóa</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trashLicenses.map((license) => (
                  <tr key={license.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900">{license.name}</p>
                      <p className="text-[10px] text-slate-500">{license.provider}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDateTime(license.deleted_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(license.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all text-[10px] font-black uppercase"
                        >
                          <RotateCcw size={14} />
                          Khôi phục
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(license.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all text-[10px] font-black uppercase"
                        >
                          <Trash2 size={14} />
                          Xóa vĩnh viễn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const HistoryView = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const ITEMS_PER_PAGE = 30;

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchFilter, actionFilter, dateFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">Thêm mới</span>;
      case 'UPDATE':
        return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase">Cập nhật</span>;
      case 'DELETE':
        return <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">Xóa</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">{action}</span>;
    }
  };

  const filteredLogs = logs.filter(log => {
    let matchesSearch = log.details?.toLowerCase().includes(searchFilter.toLowerCase()) || false;
    let matchesAction = actionFilter === 'all' || log.action === actionFilter;
    let matchesDate = true;
    if (dateFilter) {
      try {
        matchesDate = format(parseISO(log.timestamp), 'yyyy-MM-dd') === dateFilter;
      } catch {
        matchesDate = false;
      }
    }
    return matchesSearch && matchesAction && matchesDate;
  });

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
  const paginatedLogs = filteredLogs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900">Lịch sử thao tác</h3>
          <p className="text-sm text-slate-500">Theo dõi các thay đổi trong hệ thống</p>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm"
        >
          <Clock size={16} />
          Làm mới dữ liệu
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-80 shrink-0 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm nội dung chi tiết..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        <CustomSelect
          icon={Filter}
          label="Hành động"
          value={actionFilter}
          onChange={setActionFilter}
          options={[
            { value: 'all', label: 'Tất cả hành động' },
            ...uniqueActions.map(action => ({ value: action, label: action }))
          ]}
        />

        <div className="relative min-w-[180px] group">
          <div className="absolute left-4 top-[10px] h-7 w-7 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center transition-colors group-hover:text-indigo-400 z-10 pointer-events-none">
            <CalendarIcon size={16} />
          </div>
          <div className="absolute left-14 top-2.5 flex flex-col pointer-events-none z-10">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">Ngày thực hiện</span>
            <span className="text-sm font-semibold text-indigo-950 leading-none">
              {dateFilter ? format(new Date(dateFilter), 'dd/MM/yyyy') : 'Chọn ngày'}
            </span>
          </div>
          <input
            type="date"
            className="w-full pl-14 pr-10 py-2.5 h-[50px] rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50/50 transition-all text-transparent cursor-pointer relative z-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none z-10 group-hover:text-indigo-300 transition-colors" size={16} />
        </div>

        {(searchFilter || actionFilter !== 'all' || dateFilter) && (
          <button
            onClick={() => { setSearchFilter(''); setActionFilter('all'); setDateFilter(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-all text-sm font-bold uppercase tracking-wider"
          >
            <XCircle size={16} />
            Xóa lọc
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mb-4" />
            Đang tải dữ liệu lịch sử...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center">
            <History size={32} className="text-slate-300 mb-4" />
            Không tìm thấy lịch sử thao tác nào.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Thời gian</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Người thực hiện</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Hành động</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                            <UserIcon size={12} className="text-indigo-600" />
                          </div>
                          <span className="text-xs font-bold text-slate-900">{log.username || 'Hệ thống'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs min-w-[300px]">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between bg-slate-50/50 gap-4">
                <p className="text-xs font-medium text-slate-500">
                  Hiển thị {(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, filteredLogs.length)} trong số {filteredLogs.length} kết quả
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AlertsView = ({ licenses }: { licenses: License[] }) => {
  const expiringSoon = licenses
    .filter(l => getLicenseStatus(l.expiry_date, l.is_important) === 'expiring')
    .sort((a, b) => {
      // Important first
      if (a.is_important && !b.is_important) return -1;
      if (!a.is_important && b.is_important) return 1;
      // Then by expiry date
      const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
      const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
      return dateA - dateB;
    });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
              <Bell size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Danh sách cần gia hạn gấp</h3>
              <p className="text-sm text-slate-500">Các license đang trong giai đoạn sắp hết hạn (cần xử lý trong vòng 1-3 tháng)</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
            <span className="text-indigo-700 font-bold text-sm">Tìm thấy {expiringSoon.length} cảnh báo</span>
          </div>
        </div>

        {expiringSoon.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 w-16 text-center">STT</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Tên dịch vụ</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Ngày hết hạn</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Nhà cung cấp</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Bộ phận</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Mức độ ưu tiên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringSoon.map((license, idx) => (
                  <tr
                    key={license.id}
                    className={cn(
                      "hover:bg-slate-50 transition-colors group",
                      license.is_important ? "bg-amber-50/20" : ""
                    )}
                  >
                    <td className="px-6 py-4 text-center text-slate-500 text-xs font-medium">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {Boolean(license.is_important) && <Star size={14} className="fill-amber-500 text-amber-500 shrink-0" />}
                        <span className="font-bold text-slate-900 text-sm">{license.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-normal text-rose-600">
                          {license.expiry_date ? format(parseISO(license.expiry_date), 'dd/MM/yyyy') : '-'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Sắp tới hạn</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-medium">{license.provider || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                        {license.department || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {license.is_important ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase border border-rose-200 animate-pulse">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                          Ưu tiên cao
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase border border-slate-200">
                          Trung bình
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-2">Hệ thống an toàn</h4>
            <p className="text-slate-500 max-w-sm mx-auto">
              Không có license nào trong diện sắp hết hạn cần lưu ý tại thời điểm này.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomSelect = ({
  icon: Icon,
  label,
  value,
  onChange,
  options,
  minWidth = "160px"
}: {
  icon: any,
  label: string,
  value: string,
  onChange: (val: string) => void,
  options: { value: string, label: string }[],
  minWidth?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" style={{ minWidth }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 text-sm font-semibold",
          isOpen
            ? "border-indigo-500 bg-indigo-50/30 ring-4 ring-indigo-500/10"
            : "border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50/50 text-slate-600"
        )}
      >
        <div className={cn(
          "p-1.5 rounded-lg transition-colors",
          isOpen ? "bg-indigo-100 text-indigo-600" : "bg-slate-50 text-slate-400 group-hover:text-indigo-400"
        )}>
          <Icon size={16} />
        </div>
        <div className="flex flex-col items-start flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">{label}</span>
          <span className="truncate w-full text-indigo-950 text-left">{selectedOption?.label || label}</span>
        </div>
        <ChevronDown size={16} className={cn("text-slate-300 transition-transform duration-300", isOpen && "rotate-180 text-indigo-500")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 top-full mt-2 w-full min-w-[200px] bg-white rounded-3xl border border-slate-100 shadow-2xl z-[70] p-2 overflow-hidden"
            >
              <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all duration-200 group text-left",
                      value === opt.value
                        ? "bg-indigo-600 text-white font-black shadow-md shadow-indigo-200"
                        : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                    )}
                  >
                    <span>{opt.label}</span>
                    {value === opt.value && <Check size={16} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const LicenseListView = ({
  licenses, onEdit, onDelete, onAdd, onImport, onToggleImportant, onBulkRenew, onBulkDelete, visibleColumns, onToggleColumn
}: {
  licenses: License[],
  onEdit: (l: License) => void,
  onDelete: (id: number) => void,
  onAdd: () => void,
  onImport: (data: any[]) => void,
  onToggleImportant: (l: License) => void,
  onBulkRenew: (renewals: { id: number, expiry_date: string, payment_process: string, cost?: number }[]) => void,
  onBulkDelete: (ids: number[]) => void,
  visibleColumns: string[],
  onToggleColumn: (id: string) => void
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [importantFilter, setImportantFilter] = useState('all');
  const [expiryMonthFilter, setExpiryMonthFilter] = useState('');
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [historyLicense, setHistoryLicense] = useState<License | null>(null);

  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkRenewOpen, setIsBulkRenewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(l => l.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const ALL_COLUMNS = [
    { id: 'stt', label: 'STT' },
    { id: 'name', label: 'Tên dịch vụ' },
    { id: 'expiry', label: 'Ngày hết hạn' },
    { id: 'status', label: 'Trạng thái' },
    { id: 'category', label: 'Phân loại' },
    { id: 'description', label: 'Mô tả dịch vụ' },
    { id: 'scope', label: 'Phạm vi hệ thống' },
    { id: 'provider', label: 'Nhà cung cấp' },
    { id: 'department', label: 'Bộ phận' },
    { id: 'cost', label: 'Chi phí' },
  ];

  const categories = Array.from(new Set(licenses.map(l => l.category).filter(Boolean)));

  const filtered = licenses.filter(l => {
    const matchesSearch =
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.provider?.toLowerCase().includes(search.toLowerCase()) ||
      l.department?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || l.category === categoryFilter;
    const matchesImportant = importantFilter === 'all' || (importantFilter === 'important' && l.is_important) || (importantFilter === 'normal' && !l.is_important);

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const status = getLicenseStatus(l.expiry_date, l.is_important);
      if (statusFilter === 'active') matchesStatus = status === 'active';
      if (statusFilter === 'expiring') matchesStatus = status === 'expiring';
      if (statusFilter === 'expired') matchesStatus = status === 'expired';
    }

    let matchesExpiryMonth = true;
    if (expiryMonthFilter) {
      if (!l.expiry_date) {
        matchesExpiryMonth = false;
      } else {
        const date = new Date(l.expiry_date);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        matchesExpiryMonth = yearMonth === expiryMonthFilter;
      }
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesImportant && matchesExpiryMonth;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedFiltered = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, importantFilter, expiryMonthFilter]);

  const getStatusBadge = (expiryDate: string | null | undefined, isImportant: boolean) => {
    const status = getLicenseStatus(expiryDate, isImportant);
    if (status === 'expired') return <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">Hết hạn</span>;
    if (status === 'expiring') return <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase">Sắp hết hạn</span>;
    if (status === 'active') return <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">Còn hạn</span>;
    return null;
  };

  const exportTemplate = () => {
    const headers = [
      'Tên dịch vụ, bản quyền, domain',
      'Phân loại',
      'Serial Number/mã kênh',
      'Mô tả về dịch vụ',
      'Phạm vi hệ thống',
      'Nhà cung cấp/Support',
      'Mã dịch vụ/Gói cước sử dụng',
      'Mã hợp đồng',
      'Ngày cấp (YYYY-MM-DD)',
      'Thời gian hết hiệu lực (YYYY-MM-DD)',
      'Đầu mối liên hệ kinh doanh',
      'Đầu mối liên hệ kỹ thuật',
      'Website',
      'Ghi chú',
      'Chi phí',
      'Phòng ban',
      'Quan trọng (X)'
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "License_Template.xlsx");
  };

  const handleExportData = () => {
    const headers = [
      'Tên dịch vụ, bản quyền, domain',
      'Phân loại',
      'Serial Number/mã kênh',
      'Mô tả về dịch vụ',
      'Phạm vi hệ thống',
      'Nhà cung cấp/Support',
      'Mã dịch vụ/Gói cước sử dụng',
      'Mã hợp đồng',
      'Ngày cấp (YYYY-MM-DD)',
      'Thời gian hết hiệu lực (YYYY-MM-DD)',
      'Đầu mối liên hệ kinh doanh',
      'Đầu mối liên hệ kỹ thuật',
      'Website',
      'Ghi chú',
      'Chi phí',
      'Phòng ban',
      'Quan trọng (X)'
    ];

    const data = filtered.map(l => [
      l.name,
      l.category,
      l.serial_number,
      l.description,
      l.system_scope,
      l.provider,
      l.service_code,
      l.contract_code,
      l.issue_date,
      l.expiry_date,
      l.business_contact,
      l.technical_contact,
      l.website,
      l.notes,
      l.cost,
      l.department,
      l.is_important ? 'X' : ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Licenses");
    XLSX.writeFile(wb, `License_Export_${format(new Date(), 'ddMMyyyy')}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);

      const findValue = (row: any, ...keys: string[]) => {
        const rowKeys = Object.keys(row);
        for (const key of keys) {
          const foundKey = rowKeys.find(k => k.trim().toLowerCase() === key.toLowerCase());
          if (foundKey) return row[foundKey];
        }
        return undefined;
      };

      const formatDate = (val: any) => {
        if (!val) return '';
        if (val instanceof Date) {
          if (!isValid(val)) return '';
          return format(val, 'yyyy-MM-dd');
        }
        return String(val);
      };

      const mappedData = jsonData.map((row: any) => ({
        name: findValue(row, 'Tên dịch vụ, bản quyền, domain', 'Tên dịch vụ', 'License Name', 'Name'),
        category: findValue(row, 'Phân loại', 'Category', 'Type'),
        serial_number: findValue(row, 'Serial Number/mã kênh', 'Serial Number', 'Serial', 'Mã kênh'),
        description: findValue(row, 'Mô tả về dịch vụ', 'Description', 'Mô tả'),
        system_scope: findValue(row, 'Phạm vi hệ thống', 'Scope', 'System Scope'),
        provider: findValue(row, 'Nhà cung cấp/Support', 'Provider', 'Vendor', 'Nhà cung cấp'),
        service_code: findValue(row, 'Mã dịch vụ/Gói cước sử dụng', 'Service Code', 'Mã dịch vụ'),
        contract_code: findValue(row, 'Mã hợp đồng', 'Contract Code', 'Contract'),
        issue_date: formatDate(findValue(row, 'Ngày cấp (YYYY-MM-DD)', 'Ngày cấp', 'Issue Date')),
        expiry_date: formatDate(findValue(row, 'Thời gian hết hiệu lực (YYYY-MM-DD)', 'Thời gian hết hiệu lực', 'Ngày hết hạn', 'Expiry Date')),
        business_contact: findValue(row, 'Đầu mối liên hệ kinh doanh', 'Business Contact'),
        technical_contact: findValue(row, 'Đầu mối liên hệ kỹ thuật', 'Technical Contact'),
        website: findValue(row, 'Website', 'Web'),
        notes: findValue(row, 'Ghi chú', 'Notes', 'Note'),
        cost: parseFloat(String(findValue(row, 'Chi phí', 'Cost', 'Price') || 0)) || 0,
        department: findValue(row, 'Phòng ban', 'Department', 'Dept'),
        is_important: String(findValue(row, 'Quan trọng (X)', 'Important', 'Is Important') || '').toLowerCase().includes('x') ||
          String(findValue(row, 'Quan trọng (X)', 'Important', 'Is Important') || '').toLowerCase() === 'true' ||
          String(findValue(row, 'Quan trọng (X)', 'Important', 'Is Important') || '') === '1'
      })).filter(item => item.name);

      if (mappedData.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra lại tiêu đề các cột.');
        return;
      }

      onImport(mappedData);
      // Reset input
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-4">
      {selectedLicense && <LicenseDetailModal license={selectedLicense} onClose={() => setSelectedLicense(null)} />}
      {historyLicense && <RenewalHistoryModal license={historyLicense} onClose={() => setHistoryLicense(null)} />}

      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm license..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              icon={Filter}
              label="Trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'expiring', label: 'Sắp hết hạn' },
                { value: 'expired', label: 'Đã hết hạn' }
              ]}
            />

            <CustomSelect
              icon={Tag}
              label="Phân loại"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'Tất cả phân loại' },
                ...categories.map(cat => ({ value: cat, label: cat }))
              ]}
            />

            <CustomSelect
              icon={Star}
              label="Mức độ"
              value={importantFilter}
              onChange={setImportantFilter}
              options={[
                { value: 'all', label: 'Tất cả mức độ' },
                { value: 'important', label: 'Quan trọng' },
                { value: 'normal', label: 'Thông thường' }
              ]}
            />

            <div className="relative min-w-[160px] group">
              <div className="absolute left-4 top-[10px] h-7 w-7 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center transition-colors group-hover:text-indigo-400 z-10 pointer-events-none">
                <CalendarIcon size={16} />
              </div>
              <div className="absolute left-14 top-2.5 flex flex-col pointer-events-none z-10">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">Thời hạn</span>
                <span className="text-sm font-semibold text-indigo-950 leading-none">
                  {expiryMonthFilter ? format(parseISO(expiryMonthFilter + '-01'), 'MM/yyyy') : 'Chọn tháng'}
                </span>
              </div>
              <input
                type="month"
                className="w-full pl-14 pr-10 py-2.5 h-[50px] rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50/50 transition-all text-transparent cursor-pointer relative z-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                value={expiryMonthFilter}
                onChange={(e) => setExpiryMonthFilter(e.target.value)}
              />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none z-10 group-hover:text-indigo-300 transition-colors" size={16} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 mr-4 pr-4 border-r border-slate-200"
              >
                <span className="text-sm font-bold text-indigo-600 whitespace-nowrap">Đã chọn {selectedIds.length}</span>
                <button
                  onClick={() => setIsBulkRenewOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-sm whitespace-nowrap shadow-lg shadow-indigo-100"
                >
                  <RotateCcw size={16} />
                  Gia hạn
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} license đã chọn?`)) {
                      onBulkDelete(selectedIds);
                      setSelectedIds([]);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all text-sm whitespace-nowrap"
                >
                  <Trash2 size={16} />
                  Xóa
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <button
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm whitespace-nowrap"
            >
              <Columns3 size={18} />
              Hiển thị cột
            </button>

            <AnimatePresence>
              {isColumnPickerOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsColumnPickerOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-100 shadow-xl z-30 p-2 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tùy chọn hiển thị</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {ALL_COLUMNS.map(col => (
                        <button
                          key={col.id}
                          onClick={() => onToggleColumn(col.id)}
                          className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-slate-50 transition-all text-sm text-left group"
                        >
                          <span className={cn(
                            "transition-colors",
                            visibleColumns.includes(col.id) ? "text-indigo-600 font-bold" : "text-slate-600"
                          )}>
                            {col.label}
                          </span>
                          {visibleColumns.includes(col.id) && <Check size={16} className="text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button onClick={exportTemplate} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm whitespace-nowrap">
            <Download size={18} />
            Mẫu Excel
          </button>
          <button onClick={handleExportData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all text-sm whitespace-nowrap">
            <Download size={18} />
            Xuất Excel
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer text-sm whitespace-nowrap">
            <Upload size={18} />
            Import
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          </label>
          <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-sm whitespace-nowrap">
            <Plus size={18} />
            Thêm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                {visibleColumns.includes('stt') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap w-16">STT</th>}
                {visibleColumns.includes('name') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Tên dịch vụ</th>}
                {visibleColumns.includes('expiry') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Ngày hết hạn</th>}
                {visibleColumns.includes('status') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Trạng thái</th>}
                {visibleColumns.includes('category') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Phân loại</th>}
                {visibleColumns.includes('provider') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Nhà cung cấp</th>}
                {visibleColumns.includes('department') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Bộ phận</th>}
                {visibleColumns.includes('description') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Mô tả dịch vụ</th>}
                {visibleColumns.includes('scope') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Phạm vi hệ thống</th>}
                {visibleColumns.includes('cost') && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Chi phí</th>}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_4px_rgba(0,0,0,0.05)] text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedFiltered.map((license, idx) => (
                <tr
                  key={license.id}
                  onClick={() => setSelectedLicense(license)}
                  className={cn(
                    "hover:bg-indigo-50/30 transition-colors group cursor-pointer",
                    selectedIds.includes(license.id) ? "bg-indigo-50/50" : ""
                  )}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(license.id)}
                      onChange={() => toggleSelect(license.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  {visibleColumns.includes('stt') && <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>}
                  {visibleColumns.includes('name') && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleImportant(license); }}
                          className="p-1 hover:bg-slate-100 rounded-md transition-all"
                          title={license.is_important ? "Bỏ đánh dấu quan trọng" : "Đánh dấu quan trọng"}
                        >
                          <Star
                            size={16}
                            className={cn(
                              "shrink-0 transition-all",
                              license.is_important ? "text-amber-500 fill-amber-500" : "text-slate-300 hover:text-amber-400"
                            )}
                          />
                        </button>
                        <span className="font-bold text-slate-900 text-xs block min-w-[150px]">{license.name || '-'}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes('expiry') && (
                    <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">
                      {(() => {
                        if (!license.expiry_date) return '-';
                        const date = parseISO(license.expiry_date);
                        return isValid(date) ? format(date, 'dd/MM/yyyy') : license.expiry_date;
                      })()}
                    </td>
                  )}
                  {visibleColumns.includes('status') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(license.expiry_date, license.is_important || false)}
                    </td>
                  )}
                  {visibleColumns.includes('category') && <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">{license.category || '-'}</td>}
                  {visibleColumns.includes('provider') && <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">{license.provider || '-'}</td>}
                  {visibleColumns.includes('department') && <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">{license.department || '-'}</td>}
                  {visibleColumns.includes('description') && <td className="px-6 py-4 text-slate-600 text-xs min-w-[200px] max-w-[300px] truncate">{license.description || '-'}</td>}
                  {visibleColumns.includes('scope') && <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">{license.system_scope || '-'}</td>}
                  {visibleColumns.includes('cost') && <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">{license.cost ? `${license.cost.toLocaleString()} ${license.currency || 'VND'}` : '-'}</td>}
                  <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-[#f8faff] z-10 shadow-[-4px_0_4px_rgba(0,0,0,0.05)] transition-colors">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedLicense(license); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setHistoryLicense(license); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Lịch sử gia hạn"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(license); }}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                        title="Chỉnh sửa"
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(license.id); }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Xóa"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between bg-slate-50/50 gap-4">
            <p className="text-xs font-medium text-slate-500">
              Hiển thị {(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, filtered.length)} trong số {filtered.length} kết quả
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      <BulkRenewModal
        isOpen={isBulkRenewOpen}
        onClose={() => setIsBulkRenewOpen(false)}
        licenses={licenses.filter(l => selectedIds.includes(l.id))}
        onRenew={(renewals) => {
          onBulkRenew(renewals as any);
          setIsBulkRenewOpen(false);
          setSelectedIds([]);
        }}
      />
    </div>
  );
};

const FormItem = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
    {children}
  </div>
);

const InputStyle = "w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-900";

const LicenseForm = ({ license, onSave, onCancel, users, existingLicenses = [] }: { license?: Partial<License>, onSave: (l: any) => void, onCancel: () => void, users: User[], existingLicenses?: License[] }) => {
  const [formData, setFormData] = useState({
    name: license?.name || '',
    category: license?.category || '',
    serial_number: license?.serial_number || '',
    description: license?.description || '',
    system_scope: license?.system_scope || '',
    provider: license?.provider || '',
    service_code: license?.service_code || '',
    contract_code: license?.contract_code || '',
    issue_date: license?.issue_date || '',
    expiry_date: license?.expiry_date || '',
    business_contact: license?.business_contact || '',
    technical_contact: license?.technical_contact || '',
    website: license?.website || '',
    notes: license?.notes || '',
    cost: license?.cost || 0,
    currency: license?.currency || 'VND',
    owner_id: license?.owner_id || (users[0]?.id || 1),
    department: license?.department || 'IT',
    is_important: license?.is_important || false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };


  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900">{license?.id ? 'Chỉnh sửa License' : 'Thêm License mới'}</h2>
            {license?.id && <p className="text-xs text-slate-500 mt-1">ID: #{license.id}</p>}
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all shadow-sm">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
          {(() => {
            const categories = Array.from(new Set(existingLicenses.map(l => l.category).filter(Boolean)));
            const descriptions = Array.from(new Set(existingLicenses.map(l => l.description).filter(Boolean)));
            const scopes = Array.from(new Set(existingLicenses.map(l => l.system_scope).filter(Boolean)));
            const providers = Array.from(new Set(existingLicenses.map(l => l.provider).filter(Boolean)));

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Thông tin chung</h3>
                    <FormItem label="Tên dịch vụ/License">
                      <input required type="text" className={InputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nhập tên dịch vụ..." />
                    </FormItem>
                    <FormItem label="Phân loại">
                      <input list="category-suggestions" type="text" className={InputStyle} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Software, Domain, Hosting..." />
                      <datalist id="category-suggestions">
                        {categories.map((c, i) => <option key={`cat-${i}`} value={c} />)}
                      </datalist>
                    </FormItem>
                    <FormItem label="Serial/Mã kênh">
                      <input type="text" className={InputStyle} value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="S/N hoặc mã quản lý..." />
                    </FormItem>
                    <FormItem label="Mô tả">
                      <input list="description-suggestions" type="text" className={InputStyle} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả ngắn gọn về dịch vụ..." />
                      <datalist id="description-suggestions">
                        {descriptions.map((d, i) => <option key={`desc-${i}`} value={d} />)}
                      </datalist>
                    </FormItem>
                    <FormItem label="Phạm vi hệ thống">
                      <input list="scope-suggestions" type="text" className={InputStyle} value={formData.system_scope} onChange={e => setFormData({ ...formData, system_scope: e.target.value })} placeholder="Nội bộ, Khách hàng, Toàn hệ thống..." />
                      <datalist id="scope-suggestions">
                        {scopes.map((s, i) => <option key={`scope-${i}`} value={s} />)}
                      </datalist>
                    </FormItem>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Thời hạn & Trạng thái</h3>
                    <FormItem label="Ngày cấp">
                      <input type="date" className={InputStyle} value={formData.issue_date} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} />
                    </FormItem>
                    <FormItem label="Ngày hết hạn">
                      <input type="date" className={InputStyle} value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
                    </FormItem>
                    <FormItem label="Mức độ quan trọng">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_important: !formData.is_important })}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-bold text-xs uppercase tracking-wider",
                          formData.is_important
                            ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
                            : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        <Star size={16} className={cn(formData.is_important ? "fill-amber-500 text-amber-500" : "")} />
                        {formData.is_important ? "License Quan Trọng" : "Đánh dấu Quan Trọng"}
                      </button>
                    </FormItem>
                    <FormItem label="Bộ phận quản lý">
                      <select className={InputStyle} value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                        <option value="IT">IT (Công nghệ thông tin)</option>
                        <option value="HC">HC (Hành chính)</option>
                        <option value="NS">NS (Nhân sự)</option>
                        <option value="KT">KT (Kế toán)</option>
                        <option value="MKT">MKT (Marketing)</option>
                        <option value="SALES">SALES (Kinh doanh)</option>
                      </select>
                    </FormItem>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Hợp đồng & Chi phí</h3>
                    <FormItem label="Nhà cung cấp">
                      <input list="provider-suggestions" type="text" className={InputStyle} value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })} placeholder="Microsoft, CMC, FPT..." />
                      <datalist id="provider-suggestions">
                        {providers.map((p, i) => <option key={`prov-${i}`} value={p} />)}
                      </datalist>
                    </FormItem>
                    <FormItem label="Mã dịch vụ">
                      <input type="text" className={InputStyle} value={formData.service_code} onChange={e => setFormData({ ...formData, service_code: e.target.value })} />
                    </FormItem>
                    <FormItem label="Mã hợp đồng">
                      <input type="text" className={InputStyle} value={formData.contract_code} onChange={e => setFormData({ ...formData, contract_code: e.target.value })} />
                    </FormItem>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <FormItem label="Chi phí">
                          <input type="number" className={InputStyle} value={formData.cost} onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })} />
                        </FormItem>
                      </div>
                      <div>
                        <FormItem label="Đơn vị">
                          <select className={InputStyle} value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                            <option value="VND">VND</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </FormItem>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Liên hệ & Khác</h3>
                    <FormItem label="Liên hệ kinh doanh">
                      <input type="text" className={InputStyle} value={formData.business_contact} onChange={e => setFormData({ ...formData, business_contact: e.target.value })} />
                    </FormItem>
                    <FormItem label="Liên hệ kỹ thuật">
                      <input type="text" className={InputStyle} value={formData.technical_contact} onChange={e => setFormData({ ...formData, technical_contact: e.target.value })} />
                    </FormItem>
                    <FormItem label="Website">
                      <input type="text" className={InputStyle} value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
                    </FormItem>
                    <FormItem label="Ghi chú">
                      <textarea rows={2} className={cn(InputStyle, "resize-none")} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Các lưu ý khác..." />
                    </FormItem>
                  </div>
                </div>
              </>
            );
          })()}
        </form>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onCancel} className="px-8 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-all">Hủy</button>
          <button onClick={handleSubmit} className="px-8 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Lưu thay đổi</button>
        </div>
      </motion.div>
    </div>
  );
};

const SettingsAuth = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        onLogin();
      } else {
        setError('Mật mã quản trị không chính xác.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-sm w-full">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-[0_0_0_2px_rgba(225,29,72,0.1)]">
          <Lock size={28} className="drop-shadow-sm" />
        </div>
        <h3 className="text-xl font-black text-slate-900 text-center mb-2">Xác thực Quản trị</h3>
        <p className="text-sm text-slate-500 text-center mb-8">Bạn cần cung cấp thẻ hoặc mật mã để mở khóa truy cập màn hình hệ thống.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Nhập mật mã quản trị..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-center tracking-widest font-mono text-lg"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoFocus
            />
            {error && <p className="text-xs text-rose-500 font-bold mt-3 text-center animate-pulse">{error}</p>}
          </div>
          <button type="submit" className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-200/50 mt-2">
            Mở khóa
          </button>
        </form>
      </div>
    </div>
  );
};

const SettingsView = ({ users, settings, onUpdateSettings }: { users: User[], settings: any, onUpdateSettings: (key: string, value: any, skipServerSync?: boolean) => void }) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [localSmtp, setLocalSmtp] = useState({
    smtpHost: settings.smtpHost || '',
    smtpPort: settings.smtpPort || '',
    smtpSecure: settings.smtpSecure === 'true' || settings.smtpSecure === true ? 'true' : 'false',
    emailDay: settings.emailDay || 1,
    smtpUser: settings.smtpUser || '',
    smtpPass: settings.smtpPass || '',
    smtpTo: settings.smtpTo || '',
    smtpSenderName: settings.smtpSenderName || '',
    smtpSenderEmail: settings.smtpSenderEmail || ''
  });

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    setLocalSmtp({
      smtpHost: settings.smtpHost || '',
      smtpPort: settings.smtpPort || '',
      smtpSecure: settings.smtpSecure === 'true' || settings.smtpSecure === true ? 'true' : 'false',
      emailDay: settings.emailDay || 1,
      smtpUser: settings.smtpUser || '',
      smtpPass: settings.smtpPass || '',
      smtpTo: settings.smtpTo || '',
      smtpSenderName: settings.smtpSenderName || '',
      smtpSenderEmail: settings.smtpSenderEmail || ''
    });
  }, [settings]);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu không khớp');
      return;
    }

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });

      if (res.ok) {
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        alert('Đổi mật khẩu quản trị thành công!');
      } else {
        setPasswordError('Lỗi khi đổi mật khẩu.');
      }
    } catch (err) {
      setPasswordError('Lỗi kết nối máy chủ.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        onUpdateSettings(key, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestEmail = async () => {
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSmtp)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Gửi email test thành công! Vui lòng kiểm tra hộp thư (Và thư mục Spam).');
      } else {
        alert(`Lỗi gửi email: ${data.error || 'Vui lòng kiểm tra lại cấu hình SMTP.'}`);
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ khi gửi Test Email.');
    }
  };

  const handleSaveSmtp = async () => {
    try {
      const newSettingsStr = Object.fromEntries(
        Object.entries(localSmtp).map(([k, v]) => [k, String(v)])
      );

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettingsStr)
      });

      if (res.ok) {
        // Cập nhật state ở component cha (nhưng không gửi thêm PUT lẻ nữa)
        Object.entries(localSmtp).forEach(([key, val]) => {
          onUpdateSettings(key, val, true);
        });
        alert('Đã lưu cấu hình SMTP thành công!');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Lỗi khi lưu cấu hình SMTP: ${errorData.error || res.statusText}`);
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ khi lưu.');
    }
  };

  const handlePreviewEmail = async () => {
    try {
      const res = await fetch('/api/settings/preview-email');
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
      } else {
        alert('Có lỗi từ máy chủ khi tạo giao diện xem trước.');
      }
    } catch (e) {
      alert('Không thể kết nối máy chủ để xem trước email.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Cấu hình giao diện</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tiêu đề Banner chính</label>
                <input
                  type="text"
                  value={settings.bannerTitle || ''}
                  onChange={(e) => onUpdateSettings('bannerTitle', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="LicenseManager"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phụ đề Banner</label>
                <input
                  type="text"
                  value={settings.bannerSubtitle || ''}
                  onChange={(e) => onUpdateSettings('bannerSubtitle', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Management System"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Upload Logo Banner</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'logoUrl')}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-200 rounded-xl"
                />
                {settings.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo Preview" className="mt-3 h-12 w-auto object-contain p-1 border border-slate-100 rounded-lg bg-slate-50" />
                )}
              </div>
              <div className="pt-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Upload Favicon (Website Icon)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'faviconUrl')}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-200 rounded-xl"
                />
                {settings.faviconUrl && (
                  <img src={settings.faviconUrl} alt="Favicon Preview" className="mt-3 w-8 h-8 object-contain p-1 border border-slate-100 rounded-lg bg-slate-50" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Bảo mật hệ thống</h3>
        </div>
        <div className="p-6">
          <div className="max-w-md">
            <h4 className="text-sm font-bold text-slate-700 mb-2">Đổi mật khẩu quản trị viên</h4>
            <p className="text-sm text-slate-500 mb-4">
              Mật khẩu này được sử dụng để khóa khu vực Cài đặt hệ thống. Hãy bảo mật thông tin này.
            </p>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-[#1d4ed8] text-white font-bold hover:bg-[#1e40af] transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Key size={16} />
              Đổi mật khẩu
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Cấu hình Email thông báo (SMTP)</h3>
          <div className="flex gap-3">
            <button onClick={handlePreviewEmail} className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all shadow-sm">Xem Form Mail</button>
            <button onClick={handleTestEmail} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-all shadow-sm">Gửi thử Mail</button>
            <button onClick={handleSaveSmtp} className="px-5 py-2.5 bg-[#1d4ed8] text-white text-sm font-bold rounded-xl hover:bg-[#1e40af] transition-all shadow-md">Lưu áp dụng</button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Máy chủ Server SMTP (Host)</label>
              <input type="text" value={localSmtp.smtpHost} onChange={(e) => setLocalSmtp({ ...localSmtp, smtpHost: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="smtp.gmail.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cổng (Port)</label>
                <input type="number" value={localSmtp.smtpPort} onChange={(e) => setLocalSmtp({ ...localSmtp, smtpPort: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="465" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Bảo mật máy chủ</label>
                <select value={localSmtp.smtpSecure} onChange={(e) => setLocalSmtp({ ...localSmtp, smtpSecure: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                  <option value="true">SSL/TLS</option>
                  <option value="false">STARTTLS / Không</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-bold text-slate-700 mb-2">Ngày gửi báo cáo hàng tháng</label>
              <div className="flex items-center gap-3">
                <select
                  value={localSmtp.emailDay}
                  onChange={(e) => setLocalSmtp({ ...localSmtp, emailDay: parseInt(e.target.value) })}
                  className="w-20 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-center"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <span className="text-sm text-slate-500 italic">(Vào lúc 08:00 AM hàng tháng)</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tên người gửi (Sender Name)</label>
              <input type="text" value={localSmtp.smtpSenderName} onChange={(e) => setLocalSmtp({ ...localSmtp, smtpSenderName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="License Manager" />
              <p className="text-xs text-slate-500 mt-1">Tên này sẽ hiển thị với người nhận như tên người gửi.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email người gửi (Sender Email)</label>
              <input type="text" value={localSmtp.smtpSenderEmail} onChange={(e) => setLocalSmtp({ ...localSmtp, smtpSenderEmail: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="noreply@domain.com" />
              <p className="text-xs text-slate-500 mt-1">Email này hiển thị trong trường From. Có thể khác email tài khoản đăng nhập (Nếu Server SMTP cho phép).</p>
            </div>
            <div className="pt-2 border-t border-slate-100 mt-4">
              <label className="block text-sm font-bold text-slate-700 mb-2 mt-4">Email Đăng nhập quản trị mạng (Auth User)</label>
              <input type="text" value={localSmtp.smtpUser} onChange={(e) => setLocalSmtp({ ...localSmtp, smtpUser: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="admin@domain.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu ứng dụng (App Password)</label>
              <input type="password" value={localSmtp.smtpPass} onChange={(e) => setLocalSmtp({ ...localSmtp, smtpPass: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Mã bảo mật 16 ký tự hoặc Password..." />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Người nhận (Các email cách nhau bởi dấu phẩy)</label>
              <input type="text" value={localSmtp.smtpTo} onChange={(e) => setLocalSmtp({ ...localSmtp, smtpTo: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="giamdoc@domain.com, admin@domain.com" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold">Quản lý người dùng</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Tên người dùng</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Vai trò</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Phòng ban</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900 text-sm">{user.username}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    user.role === 'admin' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">{user.department || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Đổi mật khẩu quản trị viên</h3>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordError('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Nhập mật khẩu mới..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Xác nhận mật khẩu mới..."
                />
              </div>

              {passwordError && (
                <p className="text-sm text-rose-500 font-medium text-center bg-rose-50 py-2 rounded-lg">{passwordError}</p>
              )}

              <div className="pt-2">
                <button
                  onClick={handleChangePassword}
                  className="w-full py-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  Đổi mật khẩu
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {previewHtml && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Xem trước Biểu mẫu Email</h3>
              <button
                onClick={() => setPreviewHtml(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto bg-slate-50">
              <div
                className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | undefined>();

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAdminAuth') === 'true';
  });

  const handleAdminAuth = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('isAdminAuth', 'true');
  };

  const [settings, setSettings] = useState({
    bannerTitle: 'LicenseManager',
    bannerSubtitle: 'Management System',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/10819/10819699.png',
    faviconUrl: '',
    isSidebarCollapsed: localStorage.getItem('isSidebarCollapsed') !== 'false', // Default to collapsed
    visibleColumns: JSON.parse(localStorage.getItem('visibleColumns') || '["stt", "name", "expiry", "status", "category", "description", "scope"]')
  });

  const updateSettings = async (key: string, value: any, skipServerSync: boolean = false) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Local-only settings (UI Preferences) or requested skip
    if (key === 'isSidebarCollapsed' || key === 'visibleColumns' || skipServerSync) {
      if (key === 'isSidebarCollapsed' || key === 'visibleColumns') {
        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
      return;
    }

    // System-wide settings (Synced to Server)
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: stringValue })
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  useEffect(() => {
    if (settings.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings.faviconUrl]);

  const fetchData = async () => {
    try {
      const [statsRes, licensesRes, usersRes, settingsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/licenses'),
        fetch('/api/users'),
        fetch('/api/settings')
      ]);
      setStats(await statsRes.json());
      setLicenses(await licensesRes.json());
      setUsers(await usersRes.json());

      const serverSettings = await settingsRes.json();
      if (Object.keys(serverSettings).length > 0) {
        // Only update non-UI settings from server
        const { isSidebarCollapsed, visibleColumns, ...systemSettings } = serverSettings;
        setSettings(prev => ({ ...prev, ...systemSettings }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = io();
    socket.on('data_changed', () => {
      console.log('Data changed remotely, fetching updates...');
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSaveLicense = async (data: any) => {
    try {
      const url = editingLicense ? `/api/licenses/${editingLicense.id}` : '/api/licenses';
      const method = editingLicense ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setIsFormOpen(false);
        setEditingLicense(undefined);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving license:', error);
    }
  };

  const handleDeleteLicense = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa license này?')) return;
    try {
      const res = await fetch(`/api/licenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const errorData = await res.json();
        alert(`Lỗi khi xóa: ${errorData.error || 'Vui lòng thử lại.'}`);
      }
    } catch (error) {
      console.error('Error deleting license:', error);
      alert('Có lỗi xảy ra khi kết nối máy chủ.');
    }
  };

  const handleImport = async (data: any[]) => {
    try {
      const res = await fetch('/api/licenses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Import thành công!');
        fetchData();
      } else {
        try {
          const errorData = await res.json();
          alert(`Lỗi khi import: ${errorData.error || 'Vui lòng kiểm tra lại định dạng file.'}`);
        } catch (e) {
          alert(`Lỗi khi import: Máy chủ phản hồi không hợp lệ (Mã lỗi: ${res.status}). Có thể file quá lớn.`);
        }
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Có lỗi xảy ra khi kết nối máy chủ.');
    }
  };

  const handleToggleImportant = async (license: License) => {
    try {
      const res = await fetch(`/api/licenses/${license.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...license, is_important: !license.is_important })
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error toggling important status:', error);
    }
  };

  const handleBulkRenew = async (renewals: { id: number, expiry_date: string, payment_process: string, cost?: number }[]) => {
    try {
      const res = await fetch('/api/licenses/bulk/renew', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renewals })
      });
      if (res.ok) {
        alert(`Đã gia hạn thành công ${renewals.length} license.`);
        fetchData();
      }
    } catch (error) {
      console.error('Error bulk renewing:', error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      const res = await fetch('/api/licenses/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        alert(`Đã xóa thành công ${ids.length} license.`);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(`Lỗi khi xóa hàng loạt: ${errorData.error || 'Vui lòng thử lại.'}`);
        fetchData(); // Refresh lại dữ liệu để khớp với server
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('Có lỗi xảy ra khi kết nối máy chủ.');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-100 flex flex-col transition-all duration-300 ease-in-out",
        settings.isSidebarCollapsed ? "w-20 p-4" : "w-72 p-6"
      )}>
        <div className={cn("flex items-center gap-4 mb-10 px-2", settings.isSidebarCollapsed ? "justify-center" : "")}>
          <div
            onClick={() => updateSettings('isSidebarCollapsed', !settings.isSidebarCollapsed)}
            className="w-12 h-12 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
          >
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          {!settings.isSidebarCollapsed && (
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">{settings.bannerTitle}</h1>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{settings.bannerSubtitle}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem
            icon={LayoutDashboard}
            label="Tổng quan"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            collapsed={settings.isSidebarCollapsed}
          />
          <SidebarItem
            icon={Database}
            label="Kho License"
            active={activeTab === 'licenses'}
            onClick={() => setActiveTab('licenses')}
            collapsed={settings.isSidebarCollapsed}
          />
          <SidebarItem
            icon={Bell}
            label="Cảnh báo"
            active={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
            collapsed={settings.isSidebarCollapsed}
          />

          <SidebarItem
            icon={History}
            label="Lịch sử"
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            collapsed={settings.isSidebarCollapsed}
          />
          <SidebarItem
            icon={Trash2}
            label="Thùng rác"
            active={activeTab === 'trash'}
            onClick={() => setActiveTab('trash')}
            collapsed={settings.isSidebarCollapsed}
          />
          <SidebarItem
            icon={Settings}
            label="Cài đặt"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            collapsed={settings.isSidebarCollapsed}
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className={cn("flex items-center gap-3 px-2 mb-6", settings.isSidebarCollapsed ? "justify-center" : "")}>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <UserIcon size={20} className="text-slate-500" />
            </div>
            {!settings.isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-slate-900 truncate">Admin User</span>
                <span className="text-xs text-slate-500 truncate">IT Department</span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('isAdminAuth');
              setIsAdminAuthenticated(false);
              setActiveTab('dashboard');
            }}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-medium",
              settings.isSidebarCollapsed ? "justify-center" : ""
            )}
          >
            <LogOut size={20} />
            {!settings.isSidebarCollapsed && "Đăng xuất"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Trang tổng quan'}
              {activeTab === 'licenses' && 'Quản lý License'}
              {activeTab === 'alerts' && 'Cảnh báo gia hạn'}

              {activeTab === 'history' && 'Lịch sử thao tác'}
              {activeTab === 'trash' && 'Thùng rác'}
              {activeTab === 'settings' && 'Cài đặt hệ thống'}
            </h2>
            <p className="text-slate-500 mt-1">
              {activeTab === 'dashboard' && 'Chào mừng trở lại! Đây là tình trạng license của bạn hôm nay.'}
              {activeTab === 'licenses' && 'Danh sách toàn bộ license đang được quản lý trong hệ thống.'}
              {activeTab === 'alerts' && 'Danh sách các license sắp hết hạn cần thực hiện gia hạn.'}
              {activeTab === 'history' && 'Theo dõi lịch sử thêm, sửa, xóa dữ liệu trên hệ thống.'}
              {activeTab === 'trash' && 'Danh sách các license đã xóa, có thể khôi phục trong 30 ngày.'}
              {activeTab === 'settings' && 'Quản lý người dùng, phân quyền và cấu hình hệ thống.'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-500 hover:text-indigo-600 transition-all relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
            <button className="px-6 py-3 bg-white rounded-xl border border-slate-100 shadow-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
              {format(new Date(), 'eeee, dd MMMM')}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardView stats={stats} licenses={licenses} />}
            {activeTab === 'licenses' && (
              <LicenseListView
                licenses={licenses}
                onEdit={(l) => { setEditingLicense(l); setIsFormOpen(true); }}
                onDelete={handleDeleteLicense}
                onAdd={() => { setEditingLicense(undefined); setIsFormOpen(true); }}
                onImport={handleImport}
                onToggleImportant={handleToggleImportant}
                onBulkRenew={handleBulkRenew}
                onBulkDelete={handleBulkDelete}
                visibleColumns={settings.visibleColumns}
                onToggleColumn={(id) => {
                  const newCols = settings.visibleColumns.includes(id)
                    ? settings.visibleColumns.filter(c => c !== id)
                    : [...settings.visibleColumns, id];
                  updateSettings('visibleColumns', newCols);
                }}
              />
            )}
            {activeTab === 'alerts' && (
              <AlertsView licenses={licenses} />
            )}

            {activeTab === 'history' && <HistoryView />}
            {activeTab === 'trash' && <TrashView onRestore={fetchData} />}
            {activeTab === 'settings' && (
              isAdminAuthenticated ? (
                <SettingsView users={users} settings={settings} onUpdateSettings={updateSettings} />
              ) : (
                <SettingsAuth onLogin={handleAdminAuth} />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      {isFormOpen && (
        <LicenseForm
          license={editingLicense}
          users={users}
          existingLicenses={licenses}
          onSave={handleSaveLicense}
          onCancel={() => { setIsFormOpen(false); setEditingLicense(undefined); }}
        />
      )}
    </div>
  );
}

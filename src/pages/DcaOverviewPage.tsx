import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useDcaStore } from '../store/useDcaStore';
import DcaPlanGroup from '../components/dca/DcaPlanGroup';
import DcaPlanCard from '../components/dca/DcaPlanCard';
import DcaRecordList from '../components/dca/DcaRecordList';
import DcaSmartEntry from '../components/dca/DcaSmartEntry';
import DcaFixedEntry from '../components/dca/DcaFixedEntry';
import { DcaPlanType } from '../types';
import type { DcaPlan } from '../types';
import { formatCurrency } from '../utils/format';

/**
 * DcaOverviewPage — 定投计划概览页（路由 /invest/dca）
 * 两分组（聪明 / 定额）+ FAB 新建（弹层选类型分别走 T03/T04）+ 空态引导
 * + P1-3 提醒中心（聚合 lastDeductions）。
 */
const DcaOverviewPage: React.FC = () => {
  const plans = useDcaStore((s) => s.plans);
  const records = useDcaStore((s) => s.records);
  const lastDeductions = useDcaStore((s) => s.lastDeductions);
  const fetchPlans = useDcaStore((s) => s.fetchPlans);
  const fetchRecords = useDcaStore((s) => s.fetchRecords);
  const updatePlan = useDcaStore((s) => s.updatePlan);
  const deletePlan = useDcaStore((s) => s.deletePlan);

  const [choiceOpen, setChoiceOpen] = useState(false);
  const [entry, setEntry] = useState<{ open: boolean; type: DcaPlanType | null; plan: DcaPlan | null }>({
    open: false,
    type: null,
    plan: null,
  });
  const [detail, setDetail] = useState<DcaPlan | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    void fetchPlans();
    void fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 各计划累计投入（P1-4）
  const investedByPlan = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of records) {
      map[r.planId] = (map[r.planId] ?? 0) + r.amount;
    }
    return map;
  }, [records]);

  const smartPlans = plans.filter((p) => p.type === DcaPlanType.SMART);
  const fixedPlans = plans.filter((p) => p.type === DcaPlanType.FIXED);

  const renderCard = (plan: DcaPlan) => (
    <DcaPlanCard
      key={plan.id}
      plan={plan}
      investedAmount={investedByPlan[plan.id] ?? 0}
      onEdit={(p) => setDetail(p)}
      onToggleEnabled={(p, enabled) => void updatePlan(p.id, { enabled })}
    />
  );

  const choose = (type: DcaPlanType) => {
    setChoiceOpen(false);
    setEntry({ open: true, type, plan: null });
  };

  const closeEntry = () => setEntry({ open: false, type: null, plan: null });
  const onEntrySaved = () => {
    closeEntry();
    void fetchPlans();
    void fetchRecords();
    setSnack('已保存定投计划');
  };

  const handleEditFromDetail = () => {
    if (!detail) return;
    const plan = detail;
    setDetail(null);
    setEntry({ open: true, type: plan.type, plan });
  };

  const handleDelete = async (plan: DcaPlan) => {
    await deletePlan(plan.id);
    setDetail(null);
    setSnack('已删除定投计划');
  };

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        我的定投计划
      </Typography>

      {/* P1-3 提醒中心：聚合自动扣款结果 */}
      {lastDeductions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {lastDeductions.map((d) => (
            <Alert key={d.recordId} severity="success" sx={{ mb: 1 }}>
              {d.fundName} 基金 定投 {formatCurrency(d.amount)} 已记录（{d.basisDate}）
            </Alert>
          ))}
        </Box>
      )}

      {/* 空态引导 */}
      {plans.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            px: 2,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            还没有定投计划
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            设置基金定投，系统将按频率自动记录扣款并联动账户市值。
          </Typography>
          <Button variant="contained" onClick={() => setChoiceOpen(true)}>
            新建定投计划
          </Button>
        </Box>
      ) : (
        <>
          {smartPlans.length > 0 && (
            <DcaPlanGroup title="聪明定投" plans={smartPlans} renderCard={renderCard} />
          )}
          {fixedPlans.length > 0 && (
            <DcaPlanGroup title="定额定投" plans={fixedPlans} renderCard={renderCard} />
          )}
        </>
      )}

      {/* FAB 新建 */}
      <Fab
        color="warning"
        onClick={() => setChoiceOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 70,
          right: '50%',
          transform: 'translateX(215px)',
          zIndex: 1000,
        }}
      >
        <AddIcon />
      </Fab>

      {/* 选择类型弹层 */}
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>选择定投类型</DialogTitle>
        <DialogContent>
          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 1 }}
            onClick={() => choose(DcaPlanType.SMART)}
          >
            聪明定投（对标均线动态）
          </Button>
          <Button fullWidth variant="outlined" onClick={() => choose(DcaPlanType.FIXED)}>
            定额定投
          </Button>
        </DialogContent>
      </Dialog>

      {/* 录入弹层（新建 / 编辑共用） */}
      <Dialog
        open={entry.open}
        onClose={closeEntry}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent sx={{ p: 0 }}>
          {entry.type === DcaPlanType.SMART && (
            <DcaSmartEntry
              initialPlan={entry.plan}
              onClose={closeEntry}
              onSaved={onEntrySaved}
            />
          )}
          {entry.type === DcaPlanType.FIXED && (
            <DcaFixedEntry
              initialPlan={entry.plan}
              onClose={closeEntry}
              onSaved={onEntrySaved}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 详情（扣款历史 P1-2） */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle>{detail?.fundName ?? '计划详情'}</DialogTitle>
        <DialogContent>
          {detail && (
            <DcaRecordList records={records.filter((r) => r.planId === detail.id)} />
          )}
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => detail && handleDelete(detail)}>
            删除
          </Button>
          <Button onClick={() => setDetail(null)}>关闭</Button>
          <Button variant="contained" onClick={handleEditFromDetail}>
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnack(null)} sx={{ width: '100%' }}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DcaOverviewPage;

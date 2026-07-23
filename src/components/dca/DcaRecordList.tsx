import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatCurrency, formatDate } from '../../utils/format';
import type { DcaRecord } from '../../types';

/**
 * DcaRecordList — P1-2 某计划扣款历史列表（日期 / 金额 / 标的）。
 */
interface DcaRecordListProps {
  records: DcaRecord[];
  title?: string;
}

const DcaRecordList: React.FC<DcaRecordListProps> = ({ records, title = '扣款历史' }) => {
  if (records.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        暂无扣款记录
      </Typography>
    );
  }

  const sorted = [...records].sort((a, b) => b.basisDate.localeCompare(a.basisDate));

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}（{sorted.length}）
      </Typography>
      {sorted.map((r) => (
        <Box
          key={r.id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 0.5,
            borderBottom: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="body2">{formatDate(r.basisDate)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {r.fundName}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(r.amount)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default DcaRecordList;

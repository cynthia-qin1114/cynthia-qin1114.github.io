import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DEDUCTION_RULE_TABLE } from '../../config/constants';

/**
 * DeductionRuleCard — P1-1 扣款率规则表（静态展示，默认折叠，仅展示不计算）。
 * 聪明定投录入页与详情均复用。rule 为当前计划采用的规则说明。
 */
interface DeductionRuleCardProps {
  rule?: string;
}

const DeductionRuleCard: React.FC<DeductionRuleCardProps> = ({ rule }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mt: 1, mb: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            扣款率规则（P1-1）
          </Typography>
          {rule && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {rule}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={() => setExpanded((p) => !p)} aria-label="展开规则">
          <ExpandMoreIcon
            sx={{
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s',
            }}
          />
        </IconButton>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>对标均线</TableCell>
                <TableCell>低于均线</TableCell>
                <TableCell>高于均线</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DEDUCTION_RULE_TABLE.map((row) => (
                <TableRow key={row.ma}>
                  <TableCell>{row.ma}</TableCell>
                  <TableCell>{row.belowMa}</TableCell>
                  <TableCell>{row.aboveMa}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="caption" color="text.secondary">
            本期固定按基准金额扣款，动态缩放为后续规划（P2-1）。
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

export default DeductionRuleCard;

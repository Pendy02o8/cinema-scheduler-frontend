import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { positionService } from '../services/positionService';
import type { Position, PositionPayload } from '../types/position';

type PositionFormValues = {
  name: string;
  isRequired: boolean;
};

const emptyFormValues: PositionFormValues = {
  name: '',
  isRequired: true,
};

const deletePositionFallbackMessage = '此崗位已有班表或需求設定資料，無法刪除。';

function getResponseErrorMessage(error: unknown) {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof error.response === 'object'
    && error.response !== null
    && 'data' in error.response
  ) {
    const responseData = error.response.data;

    if (typeof responseData === 'string') {
      const message = responseData.trim();
      return message || null;
    }

    if (
      typeof responseData === 'object'
      && responseData !== null
      && 'message' in responseData
      && typeof responseData.message === 'string'
    ) {
      const message = responseData.message.trim();
      return message || null;
    }

    if (
      typeof responseData === 'object'
      && responseData !== null
      && 'detail' in responseData
      && typeof responseData.detail === 'string'
    ) {
      const message = responseData.detail.trim();
      return message || null;
    }
  }

  return null;
}

function getErrorMessage(error: unknown) {
  const responseMessage = getResponseErrorMessage(error);

  if (responseMessage) {
    return responseMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '發生未預期的錯誤。';
}

function getDeletePositionErrorMessage(error: unknown) {
  return getResponseErrorMessage(error) ?? deletePositionFallbackMessage;
}

export default function PositionPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<PositionFormValues>(emptyFormValues);

  const loadPositions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await positionService.getPositions();
      setPositions(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPositions();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPositions]);

  const handleOpenCreate = () => {
    setSuccess(null);
    setEditingPosition(null);
    setFormValues(emptyFormValues);
    setFormOpen(true);
  };

  const handleOpenEdit = (position: Position) => {
    setSuccess(null);
    setEditingPosition(position);
    setFormValues({
      name: position.name,
      isRequired: position.isRequired,
    });
    setFormOpen(true);
  };

  const handleOpenDelete = (position: Position) => {
    setError(null);
    setSuccess(null);
    setDeleteErrorMessage(null);
    setDeleteTarget(position);
  };

  const handleCloseForm = () => {
    if (!saving) {
      setFormOpen(false);
    }
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((current) => ({
      ...current,
      name: event.target.value,
    }));
  };

  const handleRequiredChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((current) => ({
      ...current,
      isRequired: event.target.checked,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: PositionPayload = {
      name: formValues.name.trim(),
      isRequired: formValues.isRequired,
    };

    if (!payload.name) {
      setError('崗位名稱為必填。');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    setDeleteErrorMessage(null);

    try {
      if (editingPosition) {
        await positionService.updatePosition(editingPosition.id, payload);
      } else {
        await positionService.createPosition(payload);
      }

      setFormOpen(false);
      await loadPositions();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    setDeleteErrorMessage(null);

    try {
      await positionService.deletePosition(deleteTarget.id);
      setDeleteTarget(null);
      await loadPositions();
      setSuccess('崗位已刪除。');
    } catch (deleteError) {
      setDeleteTarget(null);
      setDeleteErrorMessage(getDeletePositionErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h4" component="h2">
            {'\u5d17\u4f4d\u7ba1\u7406'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {'\u7ba1\u7406\u5f71\u57ce\u6392\u73ed\u53ef\u6307\u6d3e\u7684\u5d17\u4f4d\u8207\u9700\u6c42\u8a2d\u5b9a\u3002'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title={'\u91cd\u65b0\u6574\u7406\u5d17\u4f4d'}>
            <span>
              <IconButton onClick={loadPositions} disabled={loading || saving}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            {'\u65b0\u589e\u5d17\u4f4d'}
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>編號</TableCell>
              <TableCell>崗位名稱</TableCell>
              <TableCell>需求類型</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.id} hover>
                <TableCell>{position.id}</TableCell>
                <TableCell>{position.name}</TableCell>
                <TableCell>
                  <Chip
                    label={position.isRequired ? '必要' : '選填'}
                    color={position.isRequired ? 'primary' : 'default'}
                    size="small"
                    variant={position.isRequired ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="編輯崗位">
                    <IconButton aria-label="編輯崗位" onClick={() => handleOpenEdit(position)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="刪除崗位">
                    <IconButton
                      aria-label="刪除崗位"
                      color="error"
                      onClick={() => handleOpenDelete(position)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {!loading && positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  目前沒有崗位資料。
                </TableCell>
              </TableRow>
            ) : null}

            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  載入崗位資料中...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={formOpen} onClose={handleCloseForm} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingPosition ? '編輯崗位' : '新增崗位'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="崗位名稱"
                value={formValues.name}
                onChange={handleNameChange}
                required
                fullWidth
              />
              <FormControlLabel
                control={<Switch checked={formValues.isRequired} onChange={handleRequiredChange} />}
                label="必要崗位"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm} disabled={saving}>
              取消
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>永久刪除崗位</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>
            {`確定要永久刪除此崗位嗎？

若崗位已有班表或需求設定資料，系統將拒絕刪除。`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>
            取消
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={saving}>
            刪除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteErrorMessage)}
        onClose={() => setDeleteErrorMessage(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>無法刪除崗位</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>{deleteErrorMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setDeleteErrorMessage(null)}>
            知道了
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

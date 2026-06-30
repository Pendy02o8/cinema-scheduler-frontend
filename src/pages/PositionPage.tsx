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
  Snackbar,
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
import { positionRequirementService } from '../services/positionRequirementService';
import { positionService } from '../services/positionService';
import { scheduleAssignmentService } from '../services/scheduleAssignmentService';
import type { Position, PositionPayload } from '../types/position';
import type { PositionRequirement } from '../types/positionRequirement';

type PositionFormValues = {
  name: string;
  isRequired: boolean;
};

type RequirementTimeValues = {
  startTime: string;
  endTime: string;
};

type RequirementRow = {
  key: string;
  position: Position;
  requirement?: PositionRequirement;
};

const emptyFormValues: PositionFormValues = {
  name: '',
  isRequired: true,
};

const deletePositionFallbackMessage = '此崗位已有班表或需求設定資料，無法刪除。';
const deletePositionWithAssignmentsMessage = '此崗位已有班表資料，請先移除相關排班後再刪除。';

function toTimeInputValue(time: string) {
  return time.slice(0, 5);
}

function toApiTimeValue(time: string) {
  return time.length === 5 ? `${time}:00` : time.slice(0, 8);
}

function getRequirementKey(requirement: PositionRequirement) {
  return `requirement-${requirement.id}`;
}

function getMissingRequirementKey(position: Position) {
  return `position-${position.id}`;
}

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
  const [positionRequirements, setPositionRequirements] = useState<PositionRequirement[]>([]);
  const [requirementTimeValues, setRequirementTimeValues] = useState<Record<string, RequirementTimeValues>>({});
  const [loading, setLoading] = useState(false);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRequirementKey, setSavingRequirementKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
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

  const loadPositionRequirements = useCallback(async () => {
    setLoadingRequirements(true);
    setError(null);

    try {
      const data = await positionRequirementService.getPositionRequirements();
      setPositionRequirements(data);
      setRequirementTimeValues(
        data.reduce<Record<string, RequirementTimeValues>>((values, requirement) => {
          values[getRequirementKey(requirement)] = {
            startTime: toTimeInputValue(requirement.startTime),
            endTime: toTimeInputValue(requirement.endTime),
          };
          return values;
        }, {}),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingRequirements(false);
    }
  }, []);

  const loadPositionManagementData = useCallback(async () => {
    await Promise.all([loadPositions(), loadPositionRequirements()]);
  }, [loadPositions, loadPositionRequirements]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPositionManagementData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPositionManagementData]);

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

  const handleRequirementTimeChange = (
    requirementKey: string,
    field: keyof RequirementTimeValues,
    value: string,
  ) => {
    setRequirementTimeValues((current) => ({
      ...current,
      [requirementKey]: {
        ...(current[requirementKey] ?? { startTime: '', endTime: '' }),
        [field]: value,
      },
    }));
  };

  const handleSaveRequirement = async (row: RequirementRow) => {
    const timeValues = requirementTimeValues[row.key];

    if (!timeValues?.startTime || !timeValues.endTime) {
      setError('開始時間與結束時間為必填。');
      return;
    }

    setSavingRequirementKey(row.key);
    setError(null);
    setDeleteErrorMessage(null);

    try {
      const payload = {
        position: {
          id: row.position.id,
        },
        requiredCount: row.requirement?.requiredCount ?? 1,
        startTime: toApiTimeValue(timeValues.startTime),
        endTime: toApiTimeValue(timeValues.endTime),
      };

      if (row.requirement) {
        await positionRequirementService.updatePositionRequirement(row.requirement.id, payload);
      } else {
        await positionRequirementService.createPositionRequirement(payload);
      }

      await loadPositionManagementData();
      setSnackbarMessage('必要崗位需求時段已儲存。');
      setSnackbarOpen(true);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSavingRequirementKey(null);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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
      await loadPositionManagementData();
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
      const linkedAssignments = await scheduleAssignmentService.getScheduleAssignmentsByPosition(
        deleteTarget.id,
      );
      if (linkedAssignments.length > 0) {
        setDeleteTarget(null);
        setDeleteErrorMessage(deletePositionWithAssignmentsMessage);
        return;
      }

      const linkedRequirement = positionRequirements.find(
        (requirement) => requirement.position.id === deleteTarget.id,
      );
      if (linkedRequirement) {
        await positionRequirementService.deletePositionRequirement(linkedRequirement.id);
      }

      await positionService.deletePosition(deleteTarget.id);
      setDeleteTarget(null);
      await loadPositionManagementData();
      setSuccess('崗位已刪除。');
    } catch (deleteError) {
      setDeleteTarget(null);
      setDeleteErrorMessage(getDeletePositionErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const requirementRows: RequirementRow[] = positions
    .filter((position) => position.isRequired)
    .map((position) => {
      const requirement = positionRequirements.find(
        (positionRequirement) => positionRequirement.position.id === position.id,
      );

      return {
        key: requirement ? getRequirementKey(requirement) : getMissingRequirementKey(position),
        position,
        requirement,
      };
    });
  const refreshing = loading || loadingRequirements;

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
              <IconButton onClick={loadPositionManagementData} disabled={refreshing || saving}>
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

      <Stack spacing={1}>
        <Typography variant="h6" component="h3">
          必要崗位需求時段
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>崗位名稱</TableCell>
                <TableCell>開始時間</TableCell>
                <TableCell>結束時間</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requirementRows.map((row) => {
                const timeValues = requirementTimeValues[row.key] ?? {
                  startTime: row.requirement ? toTimeInputValue(row.requirement.startTime) : '',
                  endTime: row.requirement ? toTimeInputValue(row.requirement.endTime) : '',
                };
                const requirementSaving = savingRequirementKey === row.key;

                return (
                  <TableRow key={row.key} hover>
                    <TableCell>{row.position.name}</TableCell>
                    <TableCell>
                      <TextField
                        label="開始時間"
                        type="time"
                        size="small"
                        value={timeValues.startTime}
                        onChange={(event) => {
                          handleRequirementTimeChange(row.key, 'startTime', event.target.value);
                        }}
                        disabled={requirementSaving}
                        slotProps={{
                          inputLabel: {
                            shrink: true,
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        label="結束時間"
                        type="time"
                        size="small"
                        value={timeValues.endTime}
                        onChange={(event) => {
                          handleRequirementTimeChange(row.key, 'endTime', event.target.value);
                        }}
                        disabled={requirementSaving}
                        slotProps={{
                          inputLabel: {
                            shrink: true,
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          void handleSaveRequirement(row);
                        }}
                        disabled={requirementSaving || loadingRequirements}
                      >
                        {requirementSaving ? '儲存中...' : row.requirement ? '儲存' : '建立'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loadingRequirements && requirementRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    目前沒有必要崗位需求設定。
                  </TableCell>
                </TableRow>
              ) : null}

              {loadingRequirements ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    載入必要崗位需求時段中...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

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

若崗位只有需求時段設定，會一併刪除需求時段。
若崗位已有班表資料，系統將拒絕刪除。`}
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={handleCloseSnackbar} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

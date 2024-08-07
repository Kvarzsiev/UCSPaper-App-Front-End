import { yupResolver } from "@hookform/resolvers/yup";
import { CurrencyInput } from "react-currency-mask";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Paper,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import { DataGrid, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers";
import { isRejectedWithValue } from "@reduxjs/toolkit";
import { format } from "date-fns";
import { SyntheticEvent, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiCheck, FiChevronsLeft, FiPlus, FiSave, FiTrash2, FiX } from "react-icons/fi";
import { useQuery } from "react-query";
import { useDispatch } from "react-redux";
import { date, object, ref, string } from "yup";
import { Person } from "../../shared/@types/Person";
import { Project, Roles } from "../../shared/@types/Project";
import { Result } from "../../shared/@types/Result";
import { TabPanel } from "../../shared/components/MuiUtils/TabPanel";
import { api } from "../../shared/services/api";
import {
  deletePeopleFromProject,
  resetResulstToSave,
  saveProject,
} from "../../shared/store/modules/cruds/projectsSlice";
import { AppDispatch } from "../../shared/store/store";
import { IfPresent, isTruthy } from "../../shared/utils/Utils";
import { ProjectResultsTab } from "./ProjectResultsTab";
import { Area } from "../../shared/@types/Area";

interface DefaultValues {
  description: string;
  sponsor: string;
  sponsoredValue?: string;
  isFinished: boolean;
  startDate: Date;
  finishDate: Date | null;
  title: string;
}

interface ProjectDialogFormProps extends DialogProps {
  project?: Project;
}
const defaultValues: DefaultValues = {
  description: "",
  isFinished: false,
  sponsor: "",
  sponsoredValue: "",
  finishDate: null,
  startDate: new Date(),
  title: "",
};
const schema = object({
  title: string().required("Informe um título"),
  description: string().required("Informe uma descrição"),
  sponsor: string().nullable(),
  sponsoredValue: string().nullable().optional(),
  // isFinished: bool(),
  startDate: date().required("Informe um início").typeError("Data inválida"),
  finishDate: date().nullable().min(ref("startDate"), "Data final deve ser depois do início"),
});

type RoleOption = { id: number; role: Roles; label: string };
const roleOptions: RoleOption[] = [
  { id: 1, role: "member", label: "Membro" },
  { id: 2, role: "coordinator", label: "Coordenador" },
];

export const ProjectDialogForm: React.FC<ProjectDialogFormProps> = ({ project, ...props }) => {
  const dispatch: AppDispatch = useDispatch();
  const [isAddPersonMode, setIsAddPersonMode] = useState(false);
  const [currentOpenTab, setCurrentOpenTab] = useState(0);
  // People list
  const [people, setPeople] = useState<Project["persons"]>([]);
  const [personToAdd, setPersonToAdd] = useState<Person | null>(null);
  // Area list
  const [areas, setArea] = useState<Project["areas"]>([]);
  const [areaToAdd, setAreaToAdd] = useState<Area[]>([]);
  // Results list
  const [results, setResults] = useState<Result[]>([]);
  // Seleção pendente da implementação de deleção de registros no backend
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<Person["id"][]>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });

  const [unsavedPeopleIds, setUnsavedPeopleIds] = useState<Person["id"][]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<DefaultValues>({
    defaultValues,
    resolver: yupResolver<any>(schema),
  });

  const wTitle = watch("title");

  useEffect(() => {
    if (project && project?.areas.length > 0) {
      setAreaToAdd(project?.areas);
    } else {
      setAreaToAdd([]);
    }
  }, [project?.areas]);

  const { data: peopleAutocompleteData } = useQuery("people", async () => {
    const { data } = await api.get<Person[]>("/persons");
    return data ?? [];
  });

  const { data: areaAutocompleteData } = useQuery("area", async () => {
    const { data } = await api.get<Area[]>("/areas");
    return data ?? [];
  });

  const handleSave = async (data: DefaultValues) => {
    const toastId = toast.loading("Salvando dados...");

    const peopleToSave = unsavedPeopleIds
      .map((unsId) => {
        const person = people?.find((person) => person.id === unsId);
        return person ? { id: person.id, role: person.role } : null;
      })
      .filter(isTruthy);

    const result = await dispatch(
      saveProject({
        ...data,
        id: project?.id,
        startDate: data.startDate ?? undefined,
        finishDate: data.finishDate ?? undefined,
        title: data.title,
        persons: peopleToSave,
        areas: areaToAdd ? areaToAdd.map((areaToAdd) => areaToAdd.id) : [],
      }),
    );

    if (saveProject.rejected.match(result)) {
      if (isRejectedWithValue(result)) {
        toast.error(result.payload as string);
      } else {
        toast.error("Não foi possível salvar os dados");
      }
    } else {
      toast.success("Dado salvo com sucesso!");
      handleClose();
    }

    toast.dismiss(toastId);
  };

  const handleClose = () => {
    props.onClose && props.onClose({} as SyntheticEvent, "backdropClick");
    reset(defaultValues);
    handleResetAddPersonMode();
    setPeople([]);
    setArea([]);
    setResults([]);
    setUnsavedPeopleIds([]);
    setUnsavedPeopleIds([]);
    dispatch(resetResulstToSave());
  };

  useEffect(() => {
    if (!project) {
      setPeople([]);
      setArea([]);
      return;
    }
    setPeople(project.persons ?? []);
    setArea(project.areas ?? []);
    setResults(project.results);
    reset({
      description: project.description ?? "",
      finishDate: project.finishDate ?? null,
      isFinished: project.isFinished ?? 0,
      sponsor: project.sponsor ?? "",
      startDate: project.startDate ?? undefined,
      title: project.title,
    });
  }, [project]);

  const handleAddClick = () => {
    if (!isAddPersonMode) {
      setIsAddPersonMode(true);
      return;
    }

    if (!personToAdd) {
      toast("Informe uma pessoa para adicionar");
      return;
    }

    setUnsavedPeopleIds((state) => [...state, personToAdd.id]);
    setPeople((state) => [...(state ?? []), { ...personToAdd, role: "member" }]);
    setPersonToAdd(null);
    setIsAddPersonMode(false);
  };

  const handleResetAddPersonMode = () => {
    setIsAddPersonMode(false);
    setPersonToAdd(null);
  };

  const dateIntervalError = errors.startDate?.message ?? errors.finishDate?.message ?? "";

  const handleChangeRole = (id: Person["id"], newRole: RoleOption) => {
    setPeople((peopleState) =>
      peopleState?.map((person) => (person.id === id ? { ...person, role: newRole.role } : person)),
    );
    if (!unsavedPeopleIds.includes(id)) setUnsavedPeopleIds((state) => [...state, id]);
  };

  const handleRemovePeople = async () => {
    if (!people) {
      // Yeah, we're screwed, cuz something is very very wrong
      toast.error("Erro 29584 - Pessoas não localizadas");
      return;
    }

    const updateList = () => {
      toast.success("Registros excluidos com sucesso!");
      setPeople((state) => state?.filter((p) => !selectedPeopleIds.includes(p.id)));
    };

    if (!project) {
      updateList();
      return;
    }

    const toastId = toast.loading("Carregando dados ");
    const result = await dispatch(deletePeopleFromProject({ personsIds: selectedPeopleIds, projectId: project?.id }));

    if (deletePeopleFromProject.rejected.match(result)) {
      toast.error("Não foi possível excluir os registros");
    } else {
      updateList();
    }
    toast.dismiss(toastId);
  };

  const getTitle = () => {
    if (!project) return "Adicionar";
    if (project.isFinished) return "Dados do";
    return "Editar";
  };

  return (
    <>
      <Dialog maxWidth="xl" fullWidth {...props} onClose={handleClose}>
        <DialogTitle className="text-primary">{getTitle()} Projeto</DialogTitle>
        <DialogContent>
          {project?.isFinished && (
            <div className="text-gray-600 border-warning border-l-2 px-2 py-1">
              ⚠️ Não é possível editar um projeto já finalizado!
            </div>
          )}
          <form
            id="projectsForm"
            onSubmit={handleSubmit(handleSave)}
            className="flex flex-col w-full justify-center gap-4 py-4"
          >
            <div className="flex">
              <div className="flex flex-col gap-4 w-full justify-around ">
                <Controller
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      disabled={project?.isFinished}
                      className="max-w-4xl"
                      label="Título*"
                      placeholder="Título do projeto"
                      error={!!errors.title}
                      helperText={errors.title?.message ?? ""}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      disabled={project?.isFinished}
                      multiline
                      className="max-w-4xl"
                      size="small"
                      rows={6}
                      label="Descrição*"
                      placeholder="Descreva aqui detalhes do seu projeto..."
                      error={!!errors.description}
                      helperText={errors.description?.message ?? ""}
                    />
                  )}
                />

                <div>
                  <Controller
                    control={control}
                    name="sponsor"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        disabled={project?.isFinished}
                        className="max-w-xs mr-2"
                        label="Patrocinador"
                        placeholder="Financiador do projeto"
                        error={!!errors.sponsor}
                        helperText={errors.sponsor?.message ?? ""}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="sponsoredValue"
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value ?? project?.sponsoredValue}
                        onChangeValue={(_, value) => {
                          field.onChange(value);
                        }}
                        InputElement={
                          <TextField
                            {...field}
                            fullWidth
                            disabled={project?.isFinished}
                            className="max-w-xs mr-2"
                            label="Valor"
                            placeholder="Valor do Patrocínio"
                            error={!!errors.sponsoredValue}
                            helperText={errors.sponsoredValue?.message ?? ""}
                          />
                        }
                      />
                    )}
                  />
                </div>
              </div>
              <Autocomplete
                multiple
                value={areaToAdd}
                onChange={(_e, newValue) => setAreaToAdd(newValue)}
                fullWidth
                className="max-w-xl ml-3"
                options={
                  areaAutocompleteData?.filter((areaOption) => !areas?.find((area) => area.id === areaOption.id)) ?? []
                }
                getOptionLabel={(option) => `${option.name}`}
                renderInput={(params) => <TextField {...params} label="Áreas" />}
              />
            </div>
            <div className="flex gap-2 w-full items-center">
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    disabled={project?.isFinished}
                    slotProps={{
                      textField: {
                        error: !!errors.startDate,
                        placeholder: format(new Date(), "dd/MM/yyyy"),
                        label: "Início*",
                      },
                    }}
                  />
                )}
              />

              <small>até</small>
              <Controller
                control={control}
                name="finishDate"
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    disabled={project?.isFinished}
                    slotProps={{
                      textField: {
                        error: !!errors.finishDate,
                        label: "Fim",
                        placeholder: format(new Date(), "dd/MM/yyyy"),
                      },
                    }}
                  />
                )}
              />

              {dateIntervalError && <small className="pl-6 text-error text-center">{dateIntervalError}</small>}
            </div>
          </form>

          <Paper>
            <Tabs
              value={currentOpenTab}
              onChange={(_e, newValue) => setCurrentOpenTab(newValue)}
              aria-label="basic tabs example"
            >
              <Tab label="Pessoas" />
              <Tab label="Resultados" />
            </Tabs>
            <TabPanel value={currentOpenTab} index={0}>
              <div className="flex w-full gap-4 justify-between items-center flex-col xs:flex-row">
                <h2 className="text-primary text-xl whitespace-nowrap">Pessoas do projeto</h2>

                <div className="pt-2 flex gap-2 w-fit max-w-sm justify-end overflow-hidden flex-col smmd:flex-row">
                  <div className="flex gap-2 justify-between items-center">
                    {isAddPersonMode ? (
                      <Button startIcon={<FiX />} onClick={handleResetAddPersonMode}>
                        Cancelar
                      </Button>
                    ) : (
                      <Button
                        startIcon={<FiTrash2 />}
                        onClick={handleRemovePeople}
                        disabled={!selectedPeopleIds.length}
                      >
                        Remover
                      </Button>
                    )}
                    <Button
                      onClick={handleAddClick}
                      disabled={project?.isFinished || (isAddPersonMode && !personToAdd)}
                      startIcon={isAddPersonMode ? <FiCheck /> : <FiPlus />}
                      variant={isAddPersonMode ? "contained" : "text"}
                    >
                      Adicionar
                    </Button>
                  </div>

                  <Autocomplete
                    value={personToAdd}
                    onChange={(_e, newValue) => setPersonToAdd(newValue)}
                    fullWidth
                    className={`smmd:min-w-[10rem] ${
                      isAddPersonMode ? "" : "hidden smmd:block mr-[-10rem]"
                    } transition-all`}
                    options={
                      peopleAutocompleteData?.filter(
                        (personOption) => !people?.find((person) => person.id === personOption.id),
                      ) ?? []
                    }
                    getOptionLabel={(option) => `${option.email}`}
                    renderInput={(params) => <TextField {...params} size="small" label="Pessoa" />}
                  />
                </div>
              </div>

              <DataGrid
                rows={people ?? []}
                columns={[
                  { field: "id", headerName: "ID", flex: 0.3 },
                  { field: "name", headerName: "Nome", flex: 1 },
                  {
                    field: "role",
                    headerName: "Cargo",
                    flex: 1,
                    renderCell: (p: GridRenderCellParams<IfPresent<Project["persons"]>[number]>) => {
                      return (
                        <Autocomplete
                          value={roleOptions.find((r) => r.role === p.value)}
                          disabled={project?.isFinished}
                          onChange={(_e, newValue) => handleChangeRole(p.row.id, newValue)}
                          disableClearable
                          isOptionEqualToValue={(option, value) => option.role === value.role}
                          options={roleOptions}
                          fullWidth
                          getOptionLabel={(option: RoleOption) => option.label ?? "Não identificado"}
                          renderInput={(params) => <TextField {...params} size="small" variant="filled" />}
                        />
                      );
                    },
                  },
                ]}
                checkboxSelection
                rowSelectionModel={selectedPeopleIds}
                onRowSelectionModelChange={(newSelectionModel) => setSelectedPeopleIds(newSelectionModel as string[])}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
              />
            </TabPanel>
            <TabPanel value={currentOpenTab} index={1}>
              <ProjectResultsTab
                disabledAdd={project?.isFinished}
                project={{
                  people: people ?? [],
                  results,
                  title: wTitle,
                }}
              />
            </TabPanel>
          </Paper>
        </DialogContent>
        <DialogActions className={project?.isFinished ? "justify-start" : ""}>
          {!project?.isFinished ? (
            <>
              <Button startIcon={<FiX />} color="primary" variant="outlined" onClick={handleClose}>
                Cancelar
              </Button>
              <Button startIcon={<FiSave />} color="primary" variant="contained" type="submit" form="projectsForm">
                Salvar
              </Button>
            </>
          ) : (
            <Button startIcon={<FiChevronsLeft />} color="primary" variant="contained" onClick={handleClose}>
              Voltar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

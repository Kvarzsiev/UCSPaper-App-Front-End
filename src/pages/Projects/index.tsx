import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridExpandMoreIcon,
  GridPaginationModel,
  GridRenderCellParams,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers";
import { isRejected } from "@reduxjs/toolkit";
import { isAfter, isBefore } from "date-fns";
import { SyntheticEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiFileText, FiInfo, FiPackage, FiPlus, FiTrash2, FiUser } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { Project } from "../../shared/@types/Project";
import { ListTooltip } from "../../shared/components/ListTooltip";
import { LightTooltip } from "../../shared/components/MuiUtils/LightTooltip";
import {
  changeProjectStatus,
  deleteProjectsById,
  downloadProjectsCsv,
  findAllProjects,
} from "../../shared/store/modules/cruds/projectsSlice";
import { AppDispatch, RootState } from "../../shared/store/store";
import { confirmationToast } from "../../shared/utils/Utils";
import { ProjectDialogForm } from "./ProjectDialog";
import { Area } from "../../shared/@types/Area";
import { findAllAreas } from "../../shared/store/modules/cruds/areaSlice";

const statusFilter = {
  all: "2",
  onGoing: "1",
  finished: "0",
} as const;

const generateColumns = (handleUpdateStatus: (e: SyntheticEvent, project: Project) => any): GridColDef[] => [
  {
    field: "title",
    headerName: "Título",
    flex: 1,
  },
  {
    field: "description",
    headerName: "Descrição",
    width: 100,
    align: "center",
    headerAlign: "center",
    renderCell: (params: GridRenderCellParams<Project, string>) => (
      <LightTooltip title={<p className="text-justify text-[0.75rem] p-2">{params.value}</p>}>
        <div>
          <IconButton onClick={(e) => e.stopPropagation()} size="small">
            <FiInfo />
          </IconButton>
        </div>
      </LightTooltip>
    ),
  },
  {
    field: "sponsor",
    headerName: "Patrocinador",
    flex: 1,
  },
  {
    field: "sponsoredValue",
    headerName: "Valor",
    flex: 0.5,
  },
  {
    field: "startDate",
    headerName: "Início",
    flex: 0.5,
    valueGetter: (p: GridValueGetterParams<Project, Date>) => p.value?.toLocaleDateString("pt-BR") ?? "-",
  },
  {
    field: "finishDate",
    headerName: "Término",
    flex: 0.5,
    valueGetter: (p: GridValueGetterParams<Project, Date>) => p.value?.toLocaleDateString("pt-BR") ?? "-",
  },
  {
    field: "peopleQuantity",
    width: 40,
    headerAlign: "center",
    align: "center",
    sortable: false,
    renderHeader: () => <FiUser />,
    renderCell: (p: GridRenderCellParams<Project, null>) => (
      <ListTooltip feminine list={p.row.persons?.map((p) => p.name ?? "Não reconhecido") ?? []} subject="pessoa" />
    ),
  },
  {
    field: "resultsQuantity",
    width: 40,
    headerAlign: "center",
    align: "center",
    sortable: false,
    renderHeader: () => <FiPackage />,
    renderCell: (p: GridRenderCellParams<Project, null>) => (
      <ListTooltip list={p.row.results.map((r) => r.description) ?? []} subject="resultado" />
    ),
  },
  {
    field: "isFinished",
    headerName: "Finalizado",
    width: 100,
    headerAlign: "center",
    align: "center",
    renderCell: (p: GridRenderCellParams<Project, boolean>) => (
      <Checkbox checked={p.value ?? false} onClick={(event) => handleUpdateStatus(event, p.row)} />
    ),
  },
];

export const Projetos: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const [isProjectFormDialogOpen, setIsProjectFormDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project>();
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [rowSelectionModel, setRowSelectionModel] = useState<Project["id"][]>([]);

  // Area list
  const [areaFilter, setAreaFilter] = useState<Area | null>(null);

  const projects = useSelector<RootState, Project[]>((state) => state.projects.projects);
  const areas = useSelector<RootState, Area[]>((state) => state.areas.areas);

  const [filters, setFilters] = useState({
    description: "",
    sponsor: "",
    startDateStart: null,
    startDateEnd: null,
    finishDateStart: null,
    finishDateEnd: null,
    isFinished: "2",
  });

  useEffect(() => {
    const toastId = toast.loading("Buscando projetos...");
    dispatch(findAllProjects())
      .unwrap()
      .catch(() => toast.error("Não foi possível buscar os dados"))
      .finally(() => toast.dismiss(toastId));
  }, []);

  useEffect(() => {
    dispatch(findAllAreas())
      .unwrap()
      .catch(() => toast.error("Não foi possível buscar as áreas"));
  }, []);

  const handleFilterInputChange = (_event: any, newInputValue: Area | null) => {
    setAreaFilter(newInputValue);
    if (newInputValue) {
      dispatch(findAllProjects(newInputValue.id));
    }
  };
  const updateFilter = (field: keyof typeof filters, value: (typeof filters)[typeof field]) => {
    setFilters((state) => ({ ...state, [field]: value }));
  };

  const handleUpdateStatus = async (event: SyntheticEvent, project: Project) => {
    event.stopPropagation();
    if (
      !(await confirmationToast(
        `Tem certeza que quer marcar o projeto ${project.title} como ${project.isFinished ? "não" : ""} finalizado?`,
      ))
    )
      return;
    const result = await dispatch(changeProjectStatus(project));
    if (isRejected(result)) {
      toast.error("Não foi possível atualizar o status do projeto");
    }
  };

  const downloadCsv = async (): Promise<void> => {
    if (isRejected(await dispatch(downloadProjectsCsv(filters)))) {
      toast.error("Não foi possível baixar o CSV de projetos. Talvez nenhum projeto se encaixe no filtro enviado.");
    }
  };

  const handleDelete = async () => {
    const plural = rowSelectionModel.length > 1 ? "s" : "";
    const projectsToDelete = projects.filter((project) => rowSelectionModel.includes(project.id));
    const deleteChildrenMsg = projectsToDelete.find((project) => project.persons?.length || project.results.length)
      ? " Um ou mais projetos possuem resultados ou pessoas cadastradas. A exclusão irá deletar todos os registros filhos!"
      : "";

    if (
      !(await confirmationToast(
        <>
          <span>
            Tem certeza que quer excluir o{plural} {plural ? rowSelectionModel.length : ""} projeto{plural}?{" "}
          </span>
          {deleteChildrenMsg && (
            <div className="border-error border-l-2 py-1 px-2 my-2">
              <small>{deleteChildrenMsg}</small>
            </div>
          )}
        </>,
      ))
    )
      return;

    const toastProjectDeletionId = toast.loading("Excluindo os projetos...");
    const projectDeletionResult = await dispatch(deleteProjectsById(rowSelectionModel));

    if (isRejected(projectDeletionResult)) {
      toast.error("Não foi possível excluir os registros");
    } else {
      toast.success("Registros excluídos com sucesso!");
      setRowSelectionModel([]);
    }
    toast.dismiss(toastProjectDeletionId);
  };

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="max-w-5xl gap-10 w-full">
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<GridExpandMoreIcon />}>
              <div className="flex items-center justify-between gap-4 w-full">
                <span className="text-xl text-primary">Filtros</span>
              </div>
            </AccordionSummary>
            <AccordionDetails className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-1">
                <FormControl>
                  <FormLabel>Status: </FormLabel>
                  <RadioGroup
                    row
                    value={filters.isFinished}
                    onChange={(_e, value) => updateFilter("isFinished", value)}
                  >
                    <FormControlLabel value={statusFilter.all} control={<Radio />} label="Todos" />
                    <FormControlLabel value={statusFilter.onGoing} control={<Radio />} label="Em andamento" />
                    <FormControlLabel value={statusFilter.finished} control={<Radio />} label="Terminados" />
                  </RadioGroup>
                </FormControl>
              </div>

              <div className="grid gap-4 w-full grid-cols-2 my-4">
                <TextField
                  label="Descrição"
                  value={filters.description}
                  onChange={(e) => updateFilter("description", e.target.value)}
                />
                <TextField
                  label="Patrocinador"
                  value={filters.sponsor}
                  onChange={(e) => updateFilter("sponsor", e.target.value)}
                />
              </div>
              <div className="grid gap-4 w-full grid-cols-2 mb-4">
                <Autocomplete
                  value={areaFilter}
                  onChange={handleFilterInputChange}
                  fullWidth
                  className="max-w-xl"
                  options={areas}
                  getOptionLabel={(option) => `${option.name}`}
                  renderInput={(params) => <TextField {...params} label="Áreas" />}
                />
              </div>
              <div className="grid grid-cols-[repeat(4,auto)] items-center gap-2">
                <span className="text-gray-600">Início:</span>
                <DatePicker
                  value={filters.startDateStart}
                  onChange={(newValue) => updateFilter("startDateStart", newValue)}
                />
                <span className="text-center">até</span>
                <DatePicker
                  value={filters.startDateEnd}
                  onChange={(newValue) => updateFilter("startDateEnd", newValue)}
                />
                <span className="text-gray-600">Término:</span>
                <DatePicker
                  value={filters.finishDateStart}
                  onChange={(newValue) => updateFilter("finishDateStart", newValue)}
                />
                <span className="text-center">até</span>
                <DatePicker
                  value={filters.finishDateEnd}
                  onChange={(newValue) => updateFilter("finishDateEnd", newValue)}
                />
              </div>
            </AccordionDetails>
          </Accordion>

          <DataGrid
            rows={projects.filter(
              (row) =>
                (!filters.description ||
                  row.description?.toLocaleLowerCase().includes(filters.description.toLocaleLowerCase())) &&
                (!filters.startDateStart || (row.startDate && isAfter(row.startDate, filters.startDateStart))) &&
                (!filters.startDateEnd || (row.startDate && isBefore(row.startDate, filters.startDateEnd))) &&
                (!filters.finishDateStart || (row.finishDate && isAfter(row.finishDate, filters.finishDateStart))) &&
                (!filters.finishDateEnd || (row.finishDate && isBefore(row.finishDate, filters.finishDateEnd))) &&
                (filters.isFinished === statusFilter.all ||
                  (filters.isFinished === statusFilter.onGoing && !row.isFinished) ||
                  (filters.isFinished === statusFilter.finished && row.isFinished)) &&
                (!filters.sponsor || row.sponsor?.toLocaleLowerCase().includes(filters.sponsor.toLocaleLowerCase())),
            )}
            onRowClick={(p) => setProjectToEdit(p.row)}
            disableRowSelectionOnClick
            columns={generateColumns(handleUpdateStatus)}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            checkboxSelection
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => setRowSelectionModel(newSelection as Project["id"][])}
          />

          <div className="flex justify-end mt-4 gap-4">
            <Button
              startIcon={<FiTrash2 />}
              onClick={handleDelete}
              variant="outlined"
              disabled={!rowSelectionModel.length}
            >
              Remover
            </Button>
            <Button startIcon={<FiFileText />} variant="contained" onClick={() => downloadCsv()}>
              Baixar CSV
            </Button>
            <Button startIcon={<FiPlus />} variant="contained" onClick={() => setIsProjectFormDialogOpen(true)}>
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      <ProjectDialogForm
        open={isProjectFormDialogOpen || !!projectToEdit}
        onClose={() => {
          setIsProjectFormDialogOpen(false);
          setProjectToEdit(undefined);
        }}
        project={projectToEdit}
      />
    </>
  );
};

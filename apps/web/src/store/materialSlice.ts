import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Material, MaterialAlternative } from "@/types";

interface MaterialState {
  byProject: Record<string, Material[]>;
  status: "idle" | "loading" | "error";
  substitutionsByMaterial: Record<string, MaterialAlternative[]>;
  substitutionsStatus: "idle" | "loading" | "error";
}

const initialState: MaterialState = {
  byProject: {},
  status: "idle",
  substitutionsByMaterial: {},
  substitutionsStatus: "idle",
};

export const fetchMaterials = createAsyncThunk("materials/fetchAll", async (projectId: string) => {
  const res = await api.get<{ materials: Material[] }>(`/api/projects/${projectId}/materials`);
  return { projectId, materials: res.materials };
});

export const createMaterial = createAsyncThunk(
  "materials/create",
  async (input: {
    projectId: string;
    name: string;
    category?: string;
    price: number;
    leadTimeDays: number;
  }) => {
    const { projectId, ...body } = input;
    const res = await api.post<{ material: Material }>(`/api/projects/${projectId}/materials`, body);
    return res.material;
  }
);

export const markMaterialUnavailable = createAsyncThunk(
  "materials/markUnavailable",
  async (input: { id: string; reason: string }) => {
    const res = await api.patch<{ material: Material }>(`/api/materials/${input.id}/unavailable`, {
      reason: input.reason,
    });
    return res.material;
  }
);

export const fetchSubstitutions = createAsyncThunk("materials/fetchSubstitutions", async (materialId: string) => {
  const res = await api.get<{ alternatives: MaterialAlternative[] }>(`/api/materials/${materialId}/substitutions`);
  return { materialId, alternatives: res.alternatives };
});

export const proposeSubstitution = createAsyncThunk(
  "materials/proposeSubstitution",
  async (input: {
    materialId: string;
    name: string;
    price: number;
    leadTimeDays: number;
    notes?: string;
    changeRequestId?: string;
  }) => {
    const { materialId, ...body } = input;
    const res = await api.post<{ alternative: MaterialAlternative }>(
      `/api/materials/${materialId}/substitutions`,
      body
    );
    return { materialId, alternative: res.alternative };
  }
);

export const voteOnSubstitution = createAsyncThunk(
  "materials/vote",
  async (input: { id: string; materialId: string; vote: "UP" | "DOWN" }) => {
    const res = await api.post<{ alternative: MaterialAlternative }>(`/api/material-substitutions/${input.id}/vote`, {
      vote: input.vote,
    });
    return { materialId: input.materialId, alternative: res.alternative };
  }
);

export const commentOnSubstitution = createAsyncThunk(
  "materials/comment",
  async (input: { id: string; materialId: string; text: string }) => {
    const res = await api.post<{ alternative: MaterialAlternative }>(
      `/api/material-substitutions/${input.id}/comments`,
      { text: input.text }
    );
    return { materialId: input.materialId, alternative: res.alternative };
  }
);

export const decideSubstitution = createAsyncThunk(
  "materials/decide",
  async (input: { id: string; materialId: string; status: "APPROVED" | "REJECTED" }) => {
    const res = await api.patch<{ alternative: MaterialAlternative }>(`/api/material-substitutions/${input.id}`, {
      status: input.status,
    });
    return { materialId: input.materialId, alternative: res.alternative };
  }
);

function upsertAlternative(state: MaterialState, materialId: string, alternative: MaterialAlternative) {
  const list = state.substitutionsByMaterial[materialId] || [];
  const idx = list.findIndex((a) => a._id === alternative._id);
  if (idx >= 0) list[idx] = alternative;
  else list.unshift(alternative);
  state.substitutionsByMaterial[materialId] = list;
}

const materialSlice = createSlice({
  name: "materials",
  initialState,
  reducers: {
    receiveMaterialUnavailable(state, action: PayloadAction<Material>) {
      const list = state.byProject[action.payload.projectId];
      if (list) {
        const idx = list.findIndex((m) => m._id === action.payload._id);
        if (idx >= 0) list[idx] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterials.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.status = "idle";
        state.byProject[action.payload.projectId] = action.payload.materials;
      })
      .addCase(fetchMaterials.rejected, (state) => {
        state.status = "error";
      })
      .addCase(markMaterialUnavailable.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId];
        if (list) {
          const idx = list.findIndex((m) => m._id === action.payload._id);
          if (idx >= 0) list[idx] = action.payload;
        }
      })
      .addCase(createMaterial.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId] || [];
        state.byProject[action.payload.projectId] = [action.payload, ...list];
      })
      .addCase(fetchSubstitutions.pending, (state) => {
        state.substitutionsStatus = "loading";
      })
      .addCase(fetchSubstitutions.fulfilled, (state, action) => {
        state.substitutionsStatus = "idle";
        state.substitutionsByMaterial[action.payload.materialId] = action.payload.alternatives;
      })
      .addCase(fetchSubstitutions.rejected, (state) => {
        state.substitutionsStatus = "error";
      })
      .addCase(proposeSubstitution.fulfilled, (state, action) => {
        upsertAlternative(state, action.payload.materialId, action.payload.alternative);
      })
      .addCase(voteOnSubstitution.fulfilled, (state, action) => {
        upsertAlternative(state, action.payload.materialId, action.payload.alternative);
      })
      .addCase(commentOnSubstitution.fulfilled, (state, action) => {
        upsertAlternative(state, action.payload.materialId, action.payload.alternative);
      })
      .addCase(decideSubstitution.fulfilled, (state, action) => {
        upsertAlternative(state, action.payload.materialId, action.payload.alternative);
      });
  },
});

export const { receiveMaterialUnavailable } = materialSlice.actions;
export default materialSlice.reducer;

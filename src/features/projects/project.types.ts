// export interface ProjectSkill {
//   id: string;
//   name: string;
//   iconUrl?: string | null;
//   categoryName?: string | null;
// }

// export interface Project {
//   id: string;
//   title: string;
//   shortDescription: string;
//   description: string;
//   thumbnailUrl?: string | null;
//   gitHubUrl?: string | null;
//   skills: ProjectSkill[];
// }

export interface ProjectSkill {
  id: string;
  name: string;
  iconUrl?: string | null;
  categoryName?: string | null;
}

export type ProjectStatus = "InProgress" | "Completed" | "Archived";

export interface Project {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  status: ProjectStatus;
  thumbnailUrl?: string | null;
  gitHubUrl?: string | null;
  skills: ProjectSkill[];
}

export interface SkillOption {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface ProjectRequest {
  title: string;
  shortDescription: string;
  description: string;
  status: ProjectStatus;
  thumbnailUrl: string | null;
  gitHubUrl: string | null;
  skillIds: string[];
}

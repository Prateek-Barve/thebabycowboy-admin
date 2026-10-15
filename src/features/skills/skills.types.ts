
export interface SkillCategory {
  id: string;
  name: string;
}

export interface Skill {
  id: string;
  name: string;
  iconUrl: string | null;
  skillCategoryId: string;
  categoryName: string;
}

export interface SkillRequest {
  name: string;
  iconUrl: string | null;
  skillCategoryId: string;
}

export interface SkillCategoryRequest {
  name: string;
}

export class ValidationMessages {
    static length(field: string, constraint: 'min' | 'max', length: number): string {
        if (constraint === 'min') {
            return `Le champ <<${field}>> doit contenir au moins ${length} caracteres.`;
        } else if (constraint === 'max') {
            return `Le champ <<${field}>> ne peut pas dépasser ${length} caracteres.`;
        }
        return `Erreur de longueur pour le champ <<${field}>>.`;
    }

    static required(field: string): string {
        return `Le champ <<${field}>> est obligatoire.`;
    }

    static type(field: string, type: string): string {
        return `Le champ <<${field}>> doit etre de type "${type}".`;
    }

    static enum(field: string, enumObj: object): string {
        const allowedValues = Object.values(enumObj).join(', ');
        return `Le champ <<${field}>> doit etre l’une des valeurs suivantes : ${allowedValues}.`;
    }
}

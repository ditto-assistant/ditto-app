import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User } from "lucide-react"

interface MBTIResults {
  personality_type: string
  type_description: string
  dimension_details: {
    [key: string]: {
      preference: string
      strength: number
    }
  }
}

interface MBTIResultsProps {
  results: MBTIResults
  answers: any
  onBack: () => void
}

const MBTIResults: React.FC<MBTIResultsProps> = ({
  results,
  answers,
  onBack,
}) => {
  const getDimensionName = (dimId: string) => {
    switch (dimId) {
      case "ei":
        return "Extraversion (E) vs. Introversion (I)"
      case "sn":
        return "Sensing (S) vs. Intuition (N)"
      case "tf":
        return "Thinking (T) vs. Feeling (F)"
      case "jp":
        return "Judging (J) vs. Perceiving (P)"
      default:
        return dimId.toUpperCase()
    }
  }

  const getPreferenceColor = (preference: string) => {
    switch (preference.toLowerCase()) {
      case "e":
      case "s":
      case "t":
      case "j":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "i":
      case "n":
      case "f":
      case "p":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeColor = (type: string) => {
    // Color based on temperament groups
    const analysts = ["NT"]
    const diplomats = ["NF"]
    const sentinels = ["SJ"]
    const explorers = ["SP"]

    const typePattern = type.substring(1, 3)

    if (analysts.includes(typePattern))
      return "bg-green-100 text-green-800 border-green-200"
    if (diplomats.includes(typePattern))
      return "bg-purple-100 text-purple-800 border-purple-200"
    if (sentinels.includes(typePattern))
      return "bg-blue-100 text-blue-800 border-blue-200"
    if (explorers.includes(typePattern))
      return "bg-orange-100 text-orange-800 border-orange-200"

    return "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <div className="flex flex-col h-full p-4 bg-background text-foreground">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Button>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-purple-600" />
          <h2 className="text-xl font-semibold">MBTI Personality Results</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Personality Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Personality Type</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={`text-3xl font-bold py-3 px-6 ${getTypeColor(results.personality_type)}`}
              >
                {results.personality_type}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {results.type_description}
            </p>
          </CardContent>
        </Card>

        {/* Dimension Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personality Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(results.dimension_details).map(
              ([dimId, details]) => (
                <div key={dimId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{getDimensionName(dimId)}</h3>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={getPreferenceColor(details.preference)}
                      >
                        {details.preference}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {details.strength}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${details.strength}%` }}
                    />
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Assessment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(answers || {}).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Questions Answered
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(results.dimension_details).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Dimensions Analyzed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MBTIResults
